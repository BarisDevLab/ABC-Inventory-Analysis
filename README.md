
# ABC Inventory Analysis System

An interactive inventory management and decision support
application developed using Python and Streamlit.

## Overview

This project applies ABC inventory classification to
identify high-value inventory items and support
data-driven stock management decisions.

The application calculates annual consumption values,
classifies products into A, B and C categories,
and visualizes the results using Pareto analysis.

## Features

- ABC inventory classification
- Interactive Streamlit dashboard
- Excel and CSV file uploads
- Adjustable classification thresholds
- Pareto analysis and visualization
- Inventory performance indicators
- Automated Excel reporting
- Turkish-language user interface

## Technologies

- Python
- Pandas
- Matplotlib
- Streamlit
- Openpyxl
- Git and GitHub

## ABC Classification Method

Annual Consumption Value:

Annual Demand × Unit Price

Products are sorted by annual consumption value.

Default cumulative value thresholds:

- A: 80%
- B: 95%
- C: Remaining products

The product crossing a threshold remains in the
category in which it started.

The thresholds can be adjusted through the dashboard.

## Installation

Clone the repository:

```bash
git clone https://github.com/BarisDevLab/ABC-Inventory-Analysis.git
cd ABC-Inventory-Analysis
```

Install the required libraries:

```bash
python -m pip install -r requirements.txt
```

Run the application:

```bash
python -m streamlit run app.py
```

Open the local URL shown in the terminal.

## Input Data Format

The Excel or CSV file must contain these columns:

| Ürün | Yıllık Tüketim | Birim Fiyat (TL) |
|---|---:|---:|
| Motor | 100 | 1500 |
| Rulman | 650 | 120 |
| Sensör | 190 | 400 |

A sample Excel template can be downloaded directly
from the application.

## Engineering Applications

- Inventory management
- Supply chain analytics
- Procurement prioritization
- Operations research education
- Data-driven decision support

## Project Status

Version 0.6 - Functional local application.

## Author

BarisDevLab

Industrial Engineering Student
