# Ontology Finder UI

A lightweight, browser-based application for exploring biomedical ontology data using the **European Bioinformatics Institute’s Ontology Lookup Service (OLS4)** API.  
This tool provides both **single-term** and **batch search** functionalities, allowing users to query multiple ontologies—including the **Cell Ontology (CL)**, **Gene Ontology (GO)**, and **NCI Thesaurus (NCIT)**—and export structured results for research or analysis.

---

## 🧭 Purpose

The Ontology Finder UI was designed to streamline ontology exploration for biomedical and computational biology research.  
It simplifies data retrieval from the OLS4 API by offering an accessible, visual interface for:
- Searching ontology terms by label, short form, OBO ID, or IRI.  
- Performing batch lookups across multiple ontologies.  
- Exporting results in structured CSV format for downstream use in research, informatics pipelines, or data analysis workflows.

This project is particularly suitable for researchers working in bioinformatics, computational biology, or ontology-based data annotation who wish to query OLS resources without using command-line tools.

---

## 🧩 Key Features

- 🔍 **Single Search Mode** — Query a single term using multiple identifiers (label, short form, OBO ID, IRI).  
- 📚 **Batch Search Mode** — Upload or paste a list of terms to retrieve the best ontology matches automatically. 
- 🧠 **Multi-Ontology Support** — Search across the Cell Ontology (CL), Gene Ontology (GO), and NCI Thesaurus (NCIT), or add custom ontology prefixes.  
- 📊 **CSV Export** — Download results with ontology name, identifier, label, description, and IRI.  
- 🎨 **Interactive Visualization** — Color-coded results and progress indicators for clear data presentation.  
- 💡 **Offline Ready** — Runs fully in the browser, no backend required.  

---

## ⚙️ Project Structure

ontology-finder-ui/
├── index.html       # Main user interface (single & batch search)

├── style.css        # Styling and color themes

├── config.js        # Base API configuration (OLS4 endpoint)

├── apiClient.js     # Handles all API requests to OLS4

└── index.js         # UI logic, search flow, CSV export, progress handling

---

## 🧠 How It Works

This tool interacts with the **OLS4 REST API**, hosted by the **European Bioinformatics Institute (EBI)**.

### API Base

https://www.ebi.ac.uk/ols4

### Primary Endpoints
| Endpoint | Description |
|-----------|--------------|
| `/api/search` | Text-based lookup by label or keyword |
| `/api/terms` | Retrieve detailed metadata and definitions |
| `/api/individuals` | Access ontology individuals by IRI, OBO ID, or short form |

### Example Calls
- Search by label:  
  `https://www.ebi.ac.uk/ols4/api/search?q=T%20cell&ontology=cl`
- Retrieve term by IRI:  
  `https://www.ebi.ac.uk/ols4/api/terms?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FCL_0000084`

---

## 🧮 Output Format

When exporting batch results, the generated CSV includes the following columns:

| Column | Description |
|---------|-------------|
| `term` | Original search term |
| `ontology` | Source ontology (e.g., CL, GO, NCIT) |
| `ontology_id` | Ontology identifier (OBO ID or short form) |
| `label` | Resolved ontology label |
| `description` | Ontology term definition |
| `iri` | Direct link to the ontology resource |

---

## 🧱 Technology Stack

| Component | Technology |
|------------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| API | [EBI Ontology Lookup Service (OLS4)](https://www.ebi.ac.uk/ols4/api-docs) |
| Hosting | GitHub Pages / Netlify / Vercel (static deployment) |
| Format | JSON (API responses), CSV (exported data) |

---

## 🧪 Usage Instructions

### 1️⃣ Local Setup
Clone the repository:
```bash
git clone https://github.com/<your-username>/ontology-finder-ui.git
cd ontology-finder-ui

Thakkar, K. (2025). Ontology Finder UI: A Browser-Based Interface for Exploring Biomedical Ontologies Using OLS4.
University at Buffalo.
