---
name: deap
description: Evolutionary computation framework (DEAP). Implement genetic algorithms (GA), genetic programming (GP), evolutionary strategies (ES), particle swarm optimization (PSO), and multi-objective optimization (NSGA-II, SPEA2) using DEAP's creator/toolbox pattern. Use for combinatorial optimization, hyperparameter tuning, symbolic regression, and neuroevolution.
allowed-tools: Read Write Edit Bash
license: LGPL-3.0
compatibility: Requires Python 3.8+ and deap>=1.4.1 (pip install deap). Optional numpy for array-based fitness, matplotlib/seaborn for convergence plots, networkx for GP tree visualization, scoop for distributed evolution.
metadata:
  version: "1.0"
  skill-author: custom
---

# DEAP — Distributed Evolutionary Algorithms in Python

## Overview

DEAP is a novel evolutionary computation framework for rapid prototyping and testing of ideas. It provides data structures, algorithms, and tools to build evolutionary algorithms in a few lines of code.

**Current upstream:** deap 1.4.1 (PyPI). Docs: [deap.readthedocs.io](https://deap.readthedocs.io/).

## Installation

```bash
pip install deap
# or
uv pip install deap numpy matplotlib
```

## When to Use This Skill

- Solving combinatorial optimization problems (TSP, bin packing, scheduling)
- Hyperparameter search via evolution
- Symbolic regression / genetic programming
- Neuroevolution (evolving neural network weights or topologies)
- Multi-objective optimization (Pareto fronts, NSGA-II)
- Feature selection via GA
- Any black-box optimization where gradients are unavailable

---

## Core Concepts

DEAP is built around three concepts:

1. **`creator`** — factory for creating custom Individual/Fitness classes
2. **`toolbox`** — registry of evolutionary operators (evaluate, select, mate, mutate)
3. **Algorithms** — `eaSimple`, `eaMuPlusLambda`, `eaMuCommaLambda` loop implementations

---

## 1. Genetic Algorithm (GA) — Minimization Example

```python
import random
from deap import base, creator, tools, algorithms

# 1. Define fitness and individual
creator.create("FitnessMin", base.Fitness, weights=(-1.0,))   # minimize
creator.create("Individual", list, fitness=creator.FitnessMin)

# 2. Register toolbox operators
toolbox = base.Toolbox()
toolbox.register("attr_float", random.uniform, -5, 5)
toolbox.register("individual", tools.initRepeat, creator.Individual,
                 toolbox.attr_float, n=10)  # 10-dimensional
toolbox.register("population", tools.initRepeat, list, toolbox.individual)

def evaluate(individual):
    return (sum(x**2 for x in individual),)  # sphere function

toolbox.register("evaluate", evaluate)
toolbox.register("mate", tools.cxBlend, alpha=0.5)
toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.2, indpb=0.2)
toolbox.register("select", tools.selTournament, tournsize=3)

# 3. Run
pop = toolbox.population(n=100)
hof = tools.HallOfFame(1)
stats = tools.Statistics(lambda ind: ind.fitness.values)
stats.register("min", min)
stats.register("avg", lambda fits: sum(f[0] for f in fits) / len(fits))

pop, log = algorithms.eaSimple(pop, toolbox,
                                cxpb=0.7, mutpb=0.2,
                                ngen=50, stats=stats,
                                halloffame=hof, verbose=True)

print("Best:", hof[0], "Fitness:", hof[0].fitness.values[0])
```

**Fitness weights convention:**
- `(-1.0,)` → minimize
- `(1.0,)` → maximize
- `(1.0, -1.0)` → multi-objective: maximize first, minimize second

---

## 2. Binary / Permutation GA

```python
# Binary GA (e.g. OneMax problem)
creator.create("FitnessMax", base.Fitness, weights=(1.0,))
creator.create("Individual", list, fitness=creator.FitnessMax)

toolbox.register("attr_bool", random.randint, 0, 1)
toolbox.register("individual", tools.initRepeat, creator.Individual,
                 toolbox.attr_bool, n=100)
toolbox.register("evaluate", lambda ind: (sum(ind),))
toolbox.register("mate", tools.cxTwoPoint)
toolbox.register("mutate", tools.mutFlipBit, indpb=0.01)
toolbox.register("select", tools.selTournament, tournsize=3)
```

```python
# Permutation GA (e.g. TSP)
toolbox.register("indices", random.sample, range(N_CITIES), N_CITIES)
toolbox.register("individual", tools.initIterate,
                 creator.Individual, toolbox.indices)
toolbox.register("mate", tools.cxOrdered)        # order crossover
toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
```

---

## 3. Multi-Objective Optimization (NSGA-II)

```python
creator.create("FitnessMulti", base.Fitness, weights=(-1.0, -1.0))  # minimize both
creator.create("Individual", list, fitness=creator.FitnessMulti)

def evaluate_zdt1(individual):
    """ZDT1 benchmark — two conflicting objectives."""
    n = len(individual)
    f1 = individual[0]
    g = 1 + 9 * sum(individual[1:]) / (n - 1)
    f2 = g * (1 - (f1 / g) ** 0.5)
    return f1, f2

toolbox.register("evaluate", evaluate_zdt1)
toolbox.register("mate", tools.cxSimulatedBinaryBounded,
                 low=0, up=1, eta=20.0)
toolbox.register("mutate", tools.mutPolynomialBounded,
                 low=0, up=1, eta=20.0, indpb=1.0/30)
toolbox.register("select", tools.selNSGA2)   # NSGA-II selection

pop = toolbox.population(n=100)
pop, log = algorithms.eaMuPlusLambda(
    pop, toolbox, mu=100, lambda_=200,
    cxpb=0.7, mutpb=0.3, ngen=100
)

# Extract Pareto front
pareto = tools.sortNondominated(pop, len(pop), first_front_only=True)[0]
```

---

## 4. Genetic Programming (Symbolic Regression)

```python
import operator
import math
from deap import gp

# Define primitive set (operations + terminals)
pset = gp.PrimitiveSet("MAIN", 1)  # 1 input variable
pset.addPrimitive(operator.add, 2)
pset.addPrimitive(operator.sub, 2)
pset.addPrimitive(operator.mul, 2)
pset.addPrimitive(lambda x: 1/x if x != 0 else 1, 1, name="inv")
pset.addEphemeralConstant("rand101", lambda: random.randint(-1, 1))
pset.renameArguments(ARG0="x")

creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
creator.create("Individual", gp.PrimitiveTree, fitness=creator.FitnessMin)

toolbox.register("expr", gp.genHalfAndHalf, pset=pset, min_=1, max_=2)
toolbox.register("individual", tools.initIterate,
                 creator.Individual, toolbox.expr)
toolbox.register("compile", gp.compile, pset=pset)

def evaluate_symreg(individual, points):
    func = toolbox.compile(expr=individual)
    sqerrors = ((func(x) - x**4 - x**3 - x**2 - x)**2 for x in points)
    return (math.fsum(sqerrors) / len(points),)

toolbox.register("evaluate", evaluate_symreg,
                 points=[x/10. for x in range(-10, 10)])
toolbox.register("mate", gp.cxOnePoint)
toolbox.register("mutate", gp.mutUniform, expr=toolbox.expr, pset=pset)
toolbox.register("select", tools.selTournament, tournsize=7)
```

---

## 5. Evolutionary Strategy (ES) — CMA-ES style

```python
import numpy as np

N = 10  # dimensions
creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
creator.create("Individual", list, fitness=creator.FitnessMin)

def generate_es(icls, sigma, size, xmin, xmax):
    ind = icls(random.uniform(xmin, xmax) for _ in range(size))
    ind.strategy = [sigma] * size
    return ind

creator.create("Individual", list, fitness=creator.FitnessMin,
               strategy=None)
toolbox.register("individual", generate_es, creator.Individual,
                 sigma=0.5, size=N, xmin=-5, xmax=5)
toolbox.register("mate", tools.cxESBlend, alpha=0.1)
toolbox.register("mutate", tools.mutESLogNormal, c=1.0, indpb=0.03)
toolbox.register("select", tools.selBest)
```

---

## 6. Statistics & Logging

```python
# Multi-stat logging
stats_fit = tools.Statistics(key=lambda ind: ind.fitness.values)
stats_size = tools.Statistics(key=len)
mstats = tools.MultiStatistics(fitness=stats_fit, size=stats_size)
mstats.register("avg", np.mean)
mstats.register("std", np.std)
mstats.register("min", np.min)
mstats.register("max", np.max)

# Logbook — parse convergence history
logbook = tools.Logbook()
chapter_fit = logbook.chapters["fitness"]
gen = logbook.select("gen")
fit_min = chapter_fit.select("min")

import matplotlib.pyplot as plt
plt.plot(gen, fit_min)
plt.xlabel("Generation")
plt.ylabel("Min Fitness")
plt.title("GA Convergence")
plt.savefig("convergence.png")
```

---

## 7. Parallel Evaluation (multiprocessing / scoop)

```python
# multiprocessing
import multiprocessing
pool = multiprocessing.Pool()
toolbox.register("map", pool.map)

# scoop (distributed)
# pip install scoop
# python -m scoop script.py
from scoop import futures
toolbox.register("map", futures.map)
```

---

## 8. Checkpointing

```python
import pickle

# Save checkpoint every 10 generations
def run_with_checkpoint(pop, toolbox, ngen, checkpoint_freq=10):
    for gen in range(ngen):
        pop = algorithms.varAnd(pop, toolbox, cxpb=0.7, mutpb=0.2)
        fits = toolbox.map(toolbox.evaluate, pop)
        for fit, ind in zip(fits, pop):
            ind.fitness.values = fit
        pop = toolbox.select(pop, len(pop))
        if gen % checkpoint_freq == 0:
            with open(f"checkpoint_gen{gen}.pkl", "wb") as f:
                pickle.dump(pop, f)
    return pop

# Resume from checkpoint
with open("checkpoint_gen50.pkl", "rb") as f:
    pop = pickle.load(f)
```

---

## Available Selection Operators

| Function | Description |
|---|---|
| `selTournament(k, tournsize)` | Tournament selection |
| `selRoulette(k)` | Fitness-proportionate (roulette wheel) |
| `selBest(k)` | Elitist: top-k individuals |
| `selNSGA2(k)` | Multi-objective NSGA-II |
| `selSPEA2(k)` | Multi-objective SPEA2 |
| `selLexicase(k)` | Lexicase selection (GP) |
| `selDoubleTournament` | Size-aware tournament (GP bloat control) |

## Available Crossover Operators

| Function | Use case |
|---|---|
| `cxOnePoint` | Lists/bit-strings |
| `cxTwoPoint` | Lists/bit-strings |
| `cxUniform(indpb)` | Uniform bit exchange |
| `cxBlend(alpha)` | Real-valued vectors |
| `cxSimulatedBinaryBounded` | Real-valued, bounded |
| `cxOrdered` | Permutations (TSP) |
| `cxPartialyMatched` | Permutations (TSP) |

## Available Mutation Operators

| Function | Use case |
|---|---|
| `mutGaussian(mu, sigma, indpb)` | Real-valued |
| `mutPolynomialBounded` | Real-valued, bounded |
| `mutFlipBit(indpb)` | Binary |
| `mutShuffleIndexes(indpb)` | Permutations |
| `mutESLogNormal(c, indpb)` | Evolutionary strategies |
| `mutUniform(expr, pset)` | Genetic programming |

---

## Common Pitfalls

1. **Shallow copy bug**: DEAP individuals are lists — always use `toolbox.clone(ind)` or `copy.deepcopy`, never `ind2 = ind1`.
2. **Fitness invalidation**: After crossover/mutation, set `del ind.fitness.values` so stale values aren't reused.
3. **Creator redefinition**: `creator.create` is global — guard with `if not hasattr(creator, "FitnessMin")` in notebooks.
4. **GP tree bloat**: Use `selDoubleTournament` or add `staticLimit` decorator to cap tree depth.
5. **Single-objective tuple**: Fitness must always be a tuple — return `(value,)` not `value`.
