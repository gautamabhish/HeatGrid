---
theme: default
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## Any City Heat Mapper
  Urban Heat Island Simulation & Analysis Platform.
drawings:
  persist: false
transition: slide-left
title: Any City Heat Mapper
---

# Any City Heat Mapper

Transforming Urban Planning with AI and Interactive Heat Simulations

---
transition: fade-out
---

# The Challenge

**Urban Heat Islands (UHI)**
Cities are getting hotter, but the heat isn't distributed equally. High concentrations of concrete, asphalt, and dark roofs absorb and retain heat, making urban areas significantly warmer than their rural surroundings.

Key Problems:
*   **Health Risks:** Increased vulnerability to heat-related illnesses among citizens.
*   **Energy Consumption:** Higher demand for cooling, leading to an escalated energy footprint.
*   **Ecological Impact:** Amplified emissions and decreased local biodiversity.

Without the right data and tools, city planners cannot effectively mitigate these risks.

---

# Our Solution: Any City Heat Mapper

An interactive platform designed to help urban planners, engineers, and citizens visualize, analyze, and simulate urban heat mitigation strategies for **any city in the world**.

Key Capabilities:
*   🗺️ **Global Urban Data:** Real-time extraction of building, road, and amenity data globally via OpenStreetMap (OSM).
*   🌡️ **Live Weather Integration:** Fuses geographic data with real-time temperature metrics.
*   🤖 **AI-driven Recommendations:** Powered by Google's Gemini models.
*   🎛️ **Control Room HUD:** Dynamic, real-time sliders simulating heat mitigation tactics.

---

# Core Features

*   **Street-level Report Cards:** Get an instant analysis of the urban fabric (e.g., green space ratio vs. impervious surfaces).
*   **Dynamic Simulation UI:** 
    *   **Tree Canopy Slider:** Simulate the cooling effect of planting new trees.
    *   **Cool Roofs Slider:** Measure the impact of increasing solar reflectance on buildings.
    *   **Cool Pavements Slider:** Understand how lighter paving materials reduce surface temperatures.
*   **Impact Metrics:** View real-time calculations translating simulated interventions into actionable metrics (Temperature Drop, Energy Saved, CO₂ Mitigated).

---

# Engineering Insights via Gemini AI

The platform doesn’t just provide data; it explains it. 

*   **Intelligent Analysis:** Analyzes the fetched OSM data combined with live weather.
*   **Actionable Interventions:** Generates prioritized recommendations (e.g., "Implement Cool Roofs on Industrial Sector A").
*   **The "Why" Behind the "What":** Provides detailed "Engineering Insights" explaining the deep rationale behind each recommendation to ensure decisions are backed by environmental logic.

---

# The Technology Stack

**Frontend:**
*   **React & Next.js:** For a high-performance, SEO-friendly, and responsive single-page application experience.
*   **Premium UI/UX:** Built with modern glassmorphism, dynamic micro-animations, and a responsive mobile-first design.

**Backend & Data Pipeline:**
*   **FastAPI (Python):** High-throughput framework handling dynamic OSM data processing and AI routing.
*   **OpenStreetMap (OSM) Pipeline:** Dynamically fetches building polygons, road networks, and green spaces.
*   **Gemini 2.5 AI:** Intelligent decision engine producing structured fallback logic and JSON stream responses.

---
layout: center
class: text-center
---

# Real-world Impact

**Empowering Sustainable Cities**

By placing robust data extraction and AI-driven simulation into the hands of decision-makers, **Any City Heat Mapper** bridges the gap between raw environmental data and actionable urban design, paving the way for cooler, more resilient cities of tomorrow.

---

# Thank You

Questions?
