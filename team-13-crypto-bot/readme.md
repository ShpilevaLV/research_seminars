# Team 13 - Crypto Trading Strategy

## 👥 Members
- Valerii Bobrov - 43
- Anna Grishkina - 44
- Dmitrii Orel - 45
- Lina Shpileva - 46

## 🧠 Strategy Overview

### Core Logic
Our strategy is a **hybrid scoring system** that combines news sentiment with technical indicators.  
We do not trade on every signal – we wait for a sufficiently high confidence score (**≥20**) combined with positive volume.  
This ensures we only enter trades with a high probability of success, resulting in excellent risk-adjusted returns.

**Key principles:**
- **Score-based entry:** Only buy when cumulative score ≥20 (or alternative strong positive + oversold RSI).
- **Volume filter:** Positive volume change required for entry.
- **Multiple exit mechanisms:** Sentiment reversal, RSI overbought, price below MA20, stop-loss (8%), take-profit (25%), and max holding period (7 days).
- **Emergency sells:** RSI >80 or Bollinger position >0.98 force immediate exit.

### Decision Flowchart (Mermaid)
```mermaid
graph TD
    Start[Market Data Input] --> ComputeScore[Calculate Score: Sentiment + RSI + MACD + BB + Volume + Volatility + Trend]
    ComputeScore --> CheckPos{In position?}
    
    CheckPos -->|Yes| ExitCheck{Check exit conditions}
    ExitCheck -->|Any true| Sell[Sell]
    ExitCheck -->|None| ConvertToBuy[Convert to Buy (stay in position)]
    
    CheckPos -->|No| CheckVolume{Volume change >0?}
    CheckVolume -->|No| ConvertToSell[Convert to Sell (stay out)]
    CheckVolume -->|Yes| CheckScore{Score ≥20?}
    CheckScore -->|Yes| Buy[Buy]
    CheckScore -->|No| CheckAlt{Strong positive + RSI <40?}
    CheckAlt -->|Yes| Buy
    CheckAlt -->|No| ConvertToSell
    
    Buy --> InPos[Enter position]
    Sell --> OutPos[Exit position]
    ConvertToBuy --> InPos
    ConvertToSell --> OutPos
    
    style Buy fill:#d4edda,stroke:#28a745
    style Sell fill:#f8d7da,stroke:#dc3545
    style ConvertToBuy fill:#d4edda,stroke:#28a745,stroke-dasharray: 5 5
    style ConvertToSell fill:#f8d7da,stroke:#dc3545,stroke-dasharray: 5 5
```

### Performance Analysis
*   **Sharpe Ratio:** **1.69**
*   Total Return: +9.01%
*   Max Drawdown: -8.22%

**Strengths:**
- Excellent risk-adjusted returns (Sharpe 1.69).
- Low drawdown (-8.22%) thanks to strict exit rules.
- High win rate (64.44%) indicates good signal quality.
- Balanced number of trades (45) – active enough, yet selective.

**Limitations & Learnings:**
- The strategy is conservative: it misses some profitable opportunities due to strict filters (e.g., volume condition).
- We also tested a version (v12) with Sharpe 2.06 but only 32 trades – we preferred v14 because it offers a better balance between return and activity, making it more robust and less dependent on a few lucky trades.
- In sideways markets, the strategy may hold cash for extended periods, but this is acceptable given the overall positive performance.

**Comparison with baseline:**

- **Baseline Sharpe**: -0.92 (negative). Our strategy turned it into a strong positive 1.69.
- **Baseline Return**: -9.16%. We achieved +9.01%.
- **Baseline Drawdown**: -23.71%. We reduced it to -8.22%.

## 📁 Repository Contents

- **README.md**              ← Strategy Documentation
- **workflow.json**          ← Your modified n8n workflow file
- **trade_log.csv**          ← Backtest results (Transaction history)
- **metrics.csv**            ← Backtest results (Performance summary)
