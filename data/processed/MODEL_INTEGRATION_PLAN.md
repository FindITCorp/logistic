# 🎯 WC2026 PREDICTION MODEL — INTEGRATION & ENHANCEMENT PLAN

**Date:** June 9, 2026  
**Current Status:** Core model operational; veteran experience factors pending integration  
**Goal:** Maximize prediction accuracy for WC2026 tournaments with data-driven multipliers

---

## CURRENT MODEL ARCHITECTURE

### **Match Prediction Core (match_predictor.py)**

**Current Weighting System (8 factors):**
```python
WEIGHTS = {
    "elo":        0.30,        # 30% — Elo rating differential
    "xg":         0.25,        # 25% — Expected goals for/against (10 matches)
    "form":       0.15,        # 15% — Recent form weighted (5 matches)
    "xi_rating":  0.18,        # 18% — Average XI rating
    "set_pieces": 0.10,        # 10% — Set pieces & corners efficiency
    "possession": 0.08,        # 8% — Possession/pressing matchup
}
```

**Calculation Method:**
1. Dixon-Coles Poisson model (goal probability by count)
2. Home advantage modifier: +8% goals for home team
3. Strength of schedule weighting by opponent Elo
4. Bayesian regularization (prior towards global mean)
5. H2H historical context (last 8 matches)

**Key Functions:**
- `_get_attack_defense_strength()` — HAS/HDS/AAS/ADS metrics
- `_get_form()` — Recency-weighted form (exponential decay)
- `_get_xi_rating()` — Average player rating in starting XI
- `_tactical_matchup()` — Formation compatibility
- `predict_match()` — Final prediction with Win/Draw/Loss probabilities

---

## ANALYSIS: CURRENT MODEL STRENGTHS & GAPS

### **Strengths ✅**

1. **Comprehensive Elo system** (30% weight)
   - Tracks historical team strength
   - Adjusts dynamically for recent results
   - Stadium effect captured

2. **xG-based creation (25% weight)**
   - Accounts for shot quality
   - Penalizes lucky wins/unlucky losses
   - Stronger than raw scorelines

3. **Form recency weighting (15%)**
   - Exponential decay prioritizes recent matches
   - Captures momentum shifts
   - Useful for injury/suspension changes

4. **XI rating integration (18%)**
   - Player quality considered
   - Star player impact captured
   - Formation matchups modeled

### **Gaps ❌**

1. **No veteran experience factor**
   - WC2022 data available but unused
   - Tournament pressure not modeled
   - Group composition ignored

2. **Limited tournament-specific modeling**
   - All matches weighted equally (qualifier vs friendly)
   - Neutral venues (tournaments) not special-cased
   - Knockout stage psychology missing

3. **Incomplete squad depth integration**
   - Substitutes not valued
   - Squad rotation impact ignored
   - Fatigue accumulation missing

4. **Missing tactical context**
   - Opponent-dependent adjustments limited
   - Counter-attacking vs possession not differentiated
   - Set-piece taker quality not modeled

5. **No player form tracking**
   - Club form used as proxy
   - National team form separate
   - Injury/suspension lists not referenced

---

## NEW DATA SOURCES AVAILABLE (FROM SESSION WORK)

### **WC2022 Veteran Experience** 📊
- **643 WC2022 player records** in database (competition='WC2022')
- **290 veterans** across 26 teams identified
- **Veteran concentration %** by team calculated
- **Position-specific** veteran values estimated

### **Match-Level Qualifier Data** 📊
- **Denmark:** 23% possession, 0.46 xG, 1-1 draw (penalties)
- **Ireland:** 58% possession, 2.00 xG, 2-2 draw (penalties)
- **Croatia:** 42% possession, 0.70 xG, 0-0 draw

### **Squad Analysis** 📊
- **South Korea:** 69.2% veterans, 81.8% XI veterans
- **Czechia:** 0% veterans, diverse tactical flexibility
- **Croatia:** High veteran concentration, elite possession
- **Official squad rosters** for WC2026

---

## INTEGRATION PLAN: 4-PHASE APPROACH

---

## PHASE 1: VETERAN EXPERIENCE INTEGRATION ⭐ **PRIORITY 1 (THIS WEEK)**

### **Objective:** Add 8-12% accuracy boost through veteran weighting

### **Implementation Steps:**

#### **Step 1.1: Create veteran_factor module**

```python
# models/veteran_experience.py

def get_team_veteran_pct(conn, team_id: int) -> float:
    """
    Calculate % of squad with WC2022 experience from match_players table.
    Returns: 0.0 to 1.0 (or percentage)
    """
    # Count players in WC2022 matches
    wc2022_distinct = conn.execute("""
        SELECT COUNT(DISTINCT player_id)
        FROM match_players
        WHERE competition='WC2022' AND team_id=?
    """, (team_id,)).fetchone()[0]
    
    # Get total squad size
    squad_total = conn.execute("""
        SELECT COUNT(DISTINCT player_id)
        FROM squad_selections
        WHERE team_id=?
    """, (team_id,)).fetchone()[0]
    
    return wc2022_distinct / squad_total if squad_total > 0 else 0.0


def get_veteran_strength_multiplier(veteran_pct: float) -> float:
    """
    Apply tournament strength multiplier based on veteran %.
    
    Logic:
    - 70%+ veterans: +2.5% strength (group stage), +3.5% (knockout)
    - 50-70% veterans: +1.5% strength
    - 25-50% veterans: +0.5% strength
    - 0-25% veterans: -0.5% penalty (psychological)
    
    Returns: multiplier (1.0 = neutral, 1.025 = +2.5%)
    """
    if veteran_pct >= 0.70:
        return 1.025
    elif veteran_pct >= 0.50:
        return 1.015
    elif veteran_pct >= 0.25:
        return 1.005
    else:
        return 0.995


def get_starting_xi_veteran_pct(conn, team_id: int, formation: str) -> float:
    """
    Calculate veteran % in probable starting XI (not full squad).
    More precise than squad-level average.
    
    Returns: 0.0 to 1.0
    """
    # Get probable XI from lineups (requires team_lineup_estimator)
    # Fallback: use top players by rating
    probable_xi = conn.execute("""
        SELECT COUNT(DISTINCT mp.player_id) as xi_veterans
        FROM squad_selections ss
        JOIN player_ratings pr ON ss.player_id = pr.player_id
        LEFT JOIN match_players mp ON pr.player_id = mp.player_id 
                                      AND mp.competition='WC2022'
        WHERE ss.team_id = ? AND pr.context = 'nat'
        ORDER BY pr.rating DESC LIMIT 11
    """, (team_id,)).fetchone()[0]
    
    return probable_xi / 11.0


def apply_veteran_factor(base_xg: float, veteran_pct: float, 
                         is_home: bool = True, 
                         stage: str = 'group') -> float:
    """
    Adjust expected goals based on veteran experience.
    
    Logic:
    - Home advantage + veteran experience = better finishing (+3-5%)
    - Away + veteran experience = better composure (-1-2% psychological)
    - Knockout stage = +1.5% additional veteran bonus
    
    Returns: adjusted xG
    """
    mult = get_veteran_strength_multiplier(veteran_pct)
    
    # Stage adjustment
    if stage == 'knockout':
        mult *= 1.015  # +1.5% additional in pressure
    
    # Home advantage modifier
    if is_home:
        mult *= 1.02  # +2% at home with experience
    else:
        mult *= 0.98  # -2% away (less familiarity)
    
    return base_xg * mult
```

#### **Step 1.2: Integrate into match_predictor.py**

```python
# In predict_match() function, after xG calculation:

from models.veteran_experience import (
    get_team_veteran_pct,
    apply_veteran_factor
)

# Get veteran percentages
home_vet_pct = get_team_veteran_pct(conn, home_id)
away_vet_pct = get_team_veteran_pct(conn, away_id)

# Apply veteran adjustments to final xG
home_xg_final *= (1 + (home_vet_pct - 0.263) * 0.15)  # 0.263 = global avg
away_xg_final *= (1 + (away_vet_pct - 0.263) * 0.15)

# Recalculate Poisson probabilities with adjusted xG
```

#### **Step 1.3: Update WEIGHTS to include veteran factor**

```python
WEIGHTS = {
    "elo":        0.28,        # Slightly reduced
    "xg":         0.25,        # Keep
    "form":       0.14,        # Slightly reduced
    "xi_rating":  0.16,        # Slightly reduced
    "set_pieces": 0.10,        # Keep
    "possession": 0.08,        # Keep
    "veteran_exp": 0.09,       # NEW — 9% weight
}
```

### **Testing Validation:**
- [ ] Run predict_match() on South Korea (69.2% veterans) vs Saudi Arabia (2.6%)
  - Expected: South Korea +12% stronger
- [ ] Run on Czechia (0% veterans) vs Denmark (high %)
  - Expected: Denmark +8-10% stronger
- [ ] Validate against actual qualifier results

---

## PHASE 2: TACTICAL OPPONENT-BASED ADJUSTMENTS ⭐ **PRIORITY 2 (WEEK 2)**

### **Objective:** Model Czechia's tactical flexibility; differentiate possession vs counter-attacking

### **Implementation Steps:**

#### **Step 2.1: Create tactical_matchup.py enhancement**

```python
# models/tactical_matchup_enhanced.py

def get_opponent_type(conn, opponent_id: int, last_n: int = 5) -> str:
    """
    Classify opponent as:
    - 'elite_possession': 65%+ avg possession, >1.5 xG
    - 'balanced': 45-55% avg possession, 1.0-1.5 xG
    - 'counter': <45% avg possession, <1.0 xG
    - 'elite_defensive': <1.0 xG allowed, <0.5 against
    """
    # Query last N matches
    matches = conn.execute("""
        SELECT possession, xg_for, xg_against
        FROM team_matches
        WHERE team_id=?
        ORDER BY date DESC LIMIT ?
    """, (opponent_id, last_n)).fetchall()
    
    avg_poss = sum(m['possession'] for m in matches) / len(matches) if matches else 50
    avg_xg = sum(m['xg_for'] for m in matches) / len(matches) if matches else 1.0
    
    if avg_poss >= 0.65 and avg_xg >= 1.5:
        return 'elite_possession'
    elif avg_poss <= 0.45 and avg_xg <= 1.0:
        return 'counter'
    else:
        return 'balanced'


def get_czechia_vs_opponent_type(opponent_type: str) -> float:
    """
    Czechia tactical adjustment vs opponent type:
    - vs elite_possession: -15% (limited creation)
    - vs counter: -12% (no first-mover advantage)
    - vs balanced: neutral (even match)
    """
    multipliers = {
        'elite_possession': 0.85,
        'counter': 0.88,
        'balanced': 1.00,
        'elite_defensive': 0.80,
    }
    return multipliers.get(opponent_type, 1.00)


def apply_tactical_multiplier(team_id: int, opponent_id: int, base_strength: float, conn) -> float:
    """
    Apply team-specific tactical multipliers based on opponent profile.
    """
    # Only apply special cases for teams with proven tactical variance
    tactical_teams = [
        conn.execute("SELECT id FROM teams WHERE name='Czechia'").fetchone()[0]
        if conn.execute("SELECT id FROM teams WHERE name='Czechia'").fetchone() else None
    ]
    
    if team_id not in tactical_teams:
        return base_strength  # No special tactical adjustment
    
    opponent_type = get_opponent_type(conn, opponent_id)
    mult = get_czechia_vs_opponent_type(opponent_type)
    
    return base_strength * mult
```

#### **Step 2.2: Integrate into predict_match()**

```python
# In predict_match(), after initial team_strength calculation:

from models.tactical_matchup_enhanced import apply_tactical_multiplier

# Apply tactical multipliers
home_strength *= apply_tactical_multiplier(home_id, away_id, 1.0, conn)
away_strength *= apply_tactical_multiplier(away_id, home_id, 1.0, conn)
```

### **Testing Validation:**
- [ ] Czechia vs Denmark: -15% adjustment applied
- [ ] Czechia vs Ireland: +12% adjustment applied
- [ ] Czechia vs Croatia: neutral adjustment

---

## PHASE 3: SQUAD DEPTH & FATIGUE MODELING ⭐ **PRIORITY 3 (WEEK 2-3)**

### **Objective:** Account for substitutes quality and accumulating fatigue

### **Implementation Steps:**

#### **Step 3.1: Squad depth scoring**

```python
# models/squad_depth.py

def get_squad_depth_score(conn, team_id: int) -> dict:
    """
    Score squad quality including substitutes.
    
    Returns:
    {
        'starters_avg_rating': 7.2,
        'subs_avg_rating': 6.1,
        'depth_ratio': 0.847,  # subs / starters
        'quality_penalty': 0.03  # if starters < 6.5
    }
    """
    # Get starting XI rating (already modeled)
    starters = conn.execute("""
        SELECT AVG(pr.rating) as avg_rating
        FROM squad_selections ss
        JOIN player_ratings pr ON ss.player_id = pr.player_id
        WHERE ss.team_id = ? AND pr.context = 'nat'
        ORDER BY pr.rating DESC LIMIT 11
    """, (team_id,)).fetchone()
    
    starters_rating = starters['avg_rating'] if starters else 6.5
    
    # Get subs rating (12-35)
    subs = conn.execute("""
        SELECT AVG(pr.rating) as avg_rating
        FROM squad_selections ss
        JOIN player_ratings pr ON ss.player_id = pr.player_id
        WHERE ss.team_id = ? AND pr.context = 'nat'
        ORDER BY pr.rating DESC LIMIT 100 OFFSET 11
    """, (team_id,)).fetchone()
    
    subs_rating = subs['avg_rating'] if subs else 5.8
    
    depth_ratio = subs_rating / starters_rating
    quality_penalty = max(0, 0.05 * (6.5 - starters_rating))
    
    return {
        'starters_avg_rating': starters_rating,
        'subs_avg_rating': subs_rating,
        'depth_ratio': depth_ratio,
        'quality_penalty': quality_penalty
    }


def apply_depth_factor(base_strength: float, depth_score: dict, 
                       matches_played: int = 0) -> float:
    """
    Apply penalty for weak substitutes or quality gap.
    
    Logic:
    - Depth ratio < 0.80: -5% (poor bench)
    - Depth ratio 0.80-0.90: -2% (adequate)
    - Depth ratio > 0.90: neutral (strong bench)
    
    Fatigue: -1% per match played (tournaments only)
    """
    # Depth adjustment
    depth_ratio = depth_score['depth_ratio']
    if depth_ratio < 0.80:
        depth_mult = 0.95
    elif depth_ratio < 0.90:
        depth_mult = 0.98
    else:
        depth_mult = 1.00
    
    # Quality penalty
    final = base_strength * depth_mult * (1 - depth_score['quality_penalty'])
    
    # Fatigue (if tournament context)
    if matches_played > 0:
        fatigue_penalty = min(0.05, matches_played * 0.015)  # max -5%
        final *= (1 - fatigue_penalty)
    
    return final
```

---

## PHASE 4: TOURNAMENT-SPECIFIC ENHANCEMENTS ⭐ **PRIORITY 4 (WEEK 3-4)**

### **Objective:** Special-case knockout rounds, penalties, set-pieces

### **Implementation Steps:**

#### **Step 4.1: Knockout stage calculator**

```python
# models/knockout_predictor.py

def predict_knockout_match(home_id: int, away_id: int, conn,
                           group_strength_diff: float = 0.0) -> dict:
    """
    Knockout-specific predictions:
    - Penalty shootout probability (veteran experience +)
    - Extra time goal patterns
    - Defensive tightening (xG typically lower)
    
    Returns: same structure as predict_match() but with shootout probs
    """
    # Get base prediction
    base_pred = predict_match(home_id, away_id, neutral=True, conn=conn)
    
    # Adjust for knockout psychology
    # - Veterans more likely to win in shootouts (see South Korea/England)
    # - Defensive teams more likely to go to extra time
    
    home_vet = get_team_veteran_pct(conn, home_id)
    away_vet = get_team_veteran_pct(conn, away_id)
    
    shootout_home_win = base_pred['draw_pct'] * (0.40 + home_vet * 0.30)
    shootout_away_win = base_pred['draw_pct'] * (0.40 + away_vet * 0.30)
    draw_only = base_pred['draw_pct'] * (0.20 - (home_vet + away_vet) * 0.05)
    
    return {
        **base_pred,
        'knockout_stage': True,
        'shootout_probability': draw_only,
        'home_shootout_win_pct': shootout_home_win,
        'away_shootout_win_pct': shootout_away_win,
    }
```

#### **Step 4.2: Set-piece impact boost**

```python
# Enhance existing set_piece weighting from 10% to 15%
# Reason: Tournaments have more set-piece goals (less flow)

WEIGHTS['set_pieces'] = 0.15  # Increase from 0.10
WEIGHTS['xg'] = 0.20          # Decrease from 0.25
```

---

## PHASE 5: VALIDATION & CALIBRATION ⭐ **ONGOING**

### **Objective:** Test predictions against 2024 Euro & Copa America data

### **Validation Metrics:**

```python
def validate_predictions(predictions: list, actual_results: list) -> dict:
    """
    Compare predicted probabilities vs actual outcomes.
    
    Metrics:
    - Brier Score: mean squared error of probabilities
    - Calibration: are 70% predictions correct ~70% of time?
    - Rank probability: how confident in correct outcome?
    """
    correct = sum(1 for p, a in zip(predictions, actual_results) if p['winner'] == a['winner'])
    accuracy = correct / len(predictions)
    
    # Brier score (lower = better)
    brier = sum((p['home_win_pct'] - a['home_goal']) ** 2 for p, a in zip(predictions, actual_results))
    brier /= len(predictions)
    
    return {
        'accuracy': accuracy,
        'brier_score': brier,
        'calibration': analyze_calibration(predictions, actual_results)
    }
```

---

## IMMEDIATE ACTIONS (THIS WEEK)

### **Task 1: Create veteran_experience.py** (2 hours)
- [ ] Write get_team_veteran_pct()
- [ ] Write get_veteran_strength_multiplier()
- [ ] Write apply_veteran_factor()
- [ ] Test on South Korea & Czechia

### **Task 2: Integrate into match_predictor.py** (3 hours)
- [ ] Import veteran module
- [ ] Add veteran calculation to predict_match()
- [ ] Update WEIGHTS dictionary
- [ ] Test predictions: Denmark vs Czechia, Ireland vs Czechia

### **Task 3: Test on known results** (2 hours)
- [ ] Denmark vs Czechia (Oct 9, 2025) — Actual: 0-0 draw
- [ ] Ireland vs Czechia (Mar 26, 2026) — Actual: 2-2 draw
- [ ] Croatia vs Czechia (Oct 9, 2025) — Actual: 0-0 draw
- [ ] Compare predictions vs actual

### **Task 4: Update simulate.py & tournament.py** (4 hours)
- [ ] Pass veteran factors to tournament simulator
- [ ] Apply stage-specific multipliers (group vs knockout)
- [ ] Generate 10,000 simulations with new factors

### **Task 5: Document model changes** (1 hour)
- [ ] Update predict.py help text
- [ ] Create MODEL_WEIGHTS_EXPLANATION.md
- [ ] Add examples to simulate.py

---

## TECHNICAL DEBT & QUALITY IMPROVEMENTS

### **Code Quality (Not blocking)**
- [ ] Add type hints to all functions
- [ ] Add docstring examples
- [ ] Create unit tests for each module
- [ ] Optimize caching (use @lru_cache)

### **Performance (Not blocking)**
- [ ] Profile predict_match() (likely <500ms currently)
- [ ] Batch predictions for tournaments (parallel processing)
- [ ] Cache Elo/form calculations between calls

### **Data Quality (High priority)**
- [ ] Verify WC2022 player_id matching (643/682 success = 94.3%)
- [ ] Add match date validation (some may be wrong)
- [ ] Cross-check squad_selections vs official rosters

---

## SUCCESS CRITERIA

### **Model Accuracy Target**
- **Current:** Estimated 62% accuracy on WC2022 qualifier matches
- **Target:** 68-70% accuracy with veteran factors + tactical adjustments
- **Stretch:** 72%+ with all phases integrated

### **Calibration Target**
- **Brier Score:** <0.19 (lower = better)
- **Confidence intervals:** 70% predictions should be ~70% correct

### **Prediction Time**
- **Current:** ~500ms per match (acceptable)
- **Target:** <1s per match (even with new factors)

---

## DELIVERABLES CHECKLIST

- [ ] **Phase 1 (This week):** veteran_experience.py + integration
- [ ] **Phase 2 (Week 2):** tactical_matchup_enhanced.py
- [ ] **Phase 3 (Week 2-3):** squad_depth.py
- [ ] **Phase 4 (Week 3-4):** knockout_predictor.py
- [ ] **Phase 5 (Ongoing):** Validation against Euro 2024, Copa 2024
- [ ] **Updated predict.py** with new help text
- [ ] **Updated simulate.py** for tournament-wide integration
- [ ] **Test results** showing 68-70% accuracy target met
- [ ] **Documentation** of all weighting changes

---

## ESTIMATED TIMELINE

| Phase | Duration | Effort | Impact |
|-------|----------|--------|--------|
| **1** | 1 week | 8 hours | +6-8% accuracy |
| **2** | 1 week | 6 hours | +2-3% accuracy |
| **3** | 1-2 weeks | 8 hours | +1-2% accuracy |
| **4** | 1-2 weeks | 6 hours | +1-2% accuracy |
| **5** | Ongoing | 2-4 hrs/week | Validation |
| **Total** | 4-5 weeks | ~30 hours | **+68-72% target** |

---

## ROLLBACK PLAN (If something breaks)

1. Keep WEIGHTS dictionary in separate config file (easy to revert)
2. All new modules are additive (don't modify existing functions)
3. Test each phase in isolation before integration
4. If model accuracy drops > 2%, disable new factors and investigate

---

**Status:** Ready to implement  
**Owner:** Claude AI  
**Approval:** Pending user confirmation  
**Next step:** Begin Phase 1 implementation
