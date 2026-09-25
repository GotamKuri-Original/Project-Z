import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
import os

# Construct paths cross-platform
downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
template_path = os.path.join(downloads_dir, "SIH2026-IDEA-Presentation-Format.pptx")
prs = pptx.Presentation(template_path)

# Utility to safely replace text while keeping font
def replace_text(shape, new_text):
    if not shape.has_text_frame:
        return
    text_frame = shape.text_frame
    text_frame.clear()  # clears existing paragraphs
    p = text_frame.paragraphs[0]
    p.text = new_text
    p.font.size = Pt(14)
    p.font.name = 'Arial'
    
def add_bullet(shape, text, bold=False, level=0):
    p = shape.text_frame.add_paragraph()
    p.text = text
    p.level = level
    p.font.size = Pt(14)
    p.font.name = 'Arial'
    p.font.bold = bold

# --- SLIDE 1 ---
slide1 = prs.slides[0]
slide1.shapes[5].text_frame.clear()
p = slide1.shapes[5].text_frame.paragraphs[0]
p.text = "Problem Statement ID: SIH26184\nProblem Statement Title: Predictive Cybercrime Analytics and ATM Fraud Hotspot Detection\nTheme: Smart Automation / Security & Surveillance\nPS Category: Software\nTeam ID: [Insert Team ID]\nTeam Name (Registered on portal): CTRL Z"
for paragraph in slide1.shapes[5].text_frame.paragraphs:
    paragraph.font.size = Pt(16)
    paragraph.font.bold = True
    paragraph.font.color.rgb = RGBColor(0, 0, 0)

# Team name update across slides
for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame and "Your Team Name" in shape.text:
            shape.text_frame.paragraphs[0].text = "CTRL Z"

# --- SLIDE 2 ---
slide2 = prs.slides[1]
slide2.shapes[1].text_frame.paragraphs[0].text = "IDEA TITLE: CrimeShield AI"

tf2 = slide2.shapes[2].text_frame
tf2.clear()

p = tf2.paragraphs[0]
p.text = "Proposed Solution (Describe your Idea/Solution/Prototype)"
p.font.bold = True
p.font.size = Pt(18)
p.font.color.rgb = RGBColor(0, 112, 192) # Blue like template

add_bullet(slide2.shapes[2], "1. Detailed explanation of the proposed solution:", True)
add_bullet(slide2.shapes[2], "• API-driven predictive policing platform connecting 1930 digital complaints to physical patrols.", False, 1)
add_bullet(slide2.shapes[2], "• Auto-Trace: Automatically queries bank APIs to discover mule chain hops.", False, 1)
add_bullet(slide2.shapes[2], "• 2-Stage ML Pipeline: Predicts city (Stage 1) and exact Top 3 ATMs (Stage 2).", False, 1)

add_bullet(slide2.shapes[2], "2. How it addresses the problem:", True)
add_bullet(slide2.shapes[2], "• Eliminates the 24-hour bank-freeze latency window; operates in the 20-min Golden Hour.", False, 1)
add_bullet(slide2.shapes[2], "• Solves the tactical gap by providing exact street coordinates instead of vague city heatmaps.", False, 1)

add_bullet(slide2.shapes[2], "3. Innovation and uniqueness:", True)
add_bullet(slide2.shapes[2], "• Micro-Targeting & Automated Chain Discovery removes human guessing.", False, 1)
add_bullet(slide2.shapes[2], "• SHAP Explainable AI integration for court-admissible deployment logs.", False, 1)

# Add an image to Slide 2 if available
image_path = os.path.join(os.path.dirname(__file__), "mockup.png") 
if os.path.exists(image_path):
    slide2.shapes.add_picture(image_path, Inches(6.5), Inches(2.5), width=Inches(3.0))

# --- SLIDE 3 ---
slide3 = prs.slides[2]
tf3 = slide3.shapes[2].text_frame
tf3.clear()

p = tf3.paragraphs[0]
p.text = "1. Technologies to be used (programming languages, frameworks, hardware):"
p.font.bold = True
p.font.size = Pt(16)
p.font.color.rgb = RGBColor(0, 112, 192)

add_bullet(slide3.shapes[2], "• Machine Learning: Python, XGBoost, Scikit-Learn (CPU-optimized, <50ms inference).", False, 1)
add_bullet(slide3.shapes[2], "• Backend Engine: FastAPI (Asynchronous), Uvicorn, Pydantic.", False, 1)
add_bullet(slide3.shapes[2], "• Frontend/Geospatial: Next.js (React 19), Leaflet clustering (30,000+ nodes without lag).", False, 1)

add_bullet(slide3.shapes[2], "2. Methodology and process for implementation:", True)
add_bullet(slide3.shapes[2], "• Step 1: Ingestion (1930 / CFCFRMS) -> Victim logs fraud type & amount.", False, 1)
add_bullet(slide3.shapes[2], "• Step 2: Auto-Trace -> Bank API handshake detects mule hops.", False, 1)
add_bullet(slide3.shapes[2], "• Step 3: XGBoost Macro-Prediction -> Forecasts destination city corridor.", False, 1)
add_bullet(slide3.shapes[2], "• Step 4: Spatial Micro-Prediction -> Filters ATMs by highway proximity (<500m).", False, 1)
add_bullet(slide3.shapes[2], "• Step 5: CCTNS Dispatch -> Patrol car alerted with exact Top 3 ATMs.", False, 1)

# --- SLIDE 4 ---
slide4 = prs.slides[3]
tf4 = slide4.shapes[2].text_frame
tf4.clear()

p = tf4.paragraphs[0]
p.text = "1. Analysis of the feasibility of the idea:"
p.font.bold = True
p.font.size = Pt(16)
p.font.color.rgb = RGBColor(0, 112, 192)

add_bullet(slide4.shapes[2], "• Plug-and-Play: Integrates directly with NCRP/1930 and outputs to CCTNS.", False, 1)
add_bullet(slide4.shapes[2], "• Low Hardware Cost: Runs on standard police data center servers (no expensive GPUs needed).", False, 1)

add_bullet(slide4.shapes[2], "2. Potential challenges and risks:", True)
add_bullet(slide4.shapes[2], "• Reporting Delay Latency (victim reports 24h late).", False, 1)
add_bullet(slide4.shapes[2], "• Data Privacy (PII) compliance.", False, 1)

add_bullet(slide4.shapes[2], "3. Strategies for overcoming these challenges:", True)
add_bullet(slide4.shapes[2], "• Model explicitly weights 'reporting_delay_mins' -> shifts to border ATMs for delayed reports.", False, 1)
add_bullet(slide4.shapes[2], "• Complete PII Privacy via one-way SHA-256 hashing. Only spatial coordinates are transmitted.", False, 1)

# --- SLIDE 5 ---
slide5 = prs.slides[4]
tf5 = slide5.shapes[2].text_frame
tf5.clear()

p = tf5.paragraphs[0]
p.text = "1. Potential impact on the target audience:"
p.font.bold = True
p.font.size = Pt(16)
p.font.color.rgb = RGBColor(0, 112, 192)

add_bullet(slide5.shapes[2], "• Law Enforcement: Shifts from passive paperwork to proactive physical interdiction.", False, 1)
add_bullet(slide5.shapes[2], "• First Responders: Given exact GPS coordinates rather than vague circulars.", False, 1)

add_bullet(slide5.shapes[2], "2. Benefits of the solution:", True)
add_bullet(slide5.shapes[2], "• 100% Direct Recovery: Intercepting the runner recovers stolen cash physically on-scene.", False, 1)
add_bullet(slide5.shapes[2], "• Disrupts Hierarchy: Catching a runner yields burner phones, collapsing the syndicate.", False, 1)
add_bullet(slide5.shapes[2], "• Golden Hour: Reduces intervention latency from 24+ hours to <20 minutes.", False, 1)
add_bullet(slide5.shapes[2], "• Operational Efficiency: Automates cross-bank mule correlation, saving hundreds of hours.", False, 1)


# --- SLIDE 6 ---
slide6 = prs.slides[5]
tf6 = slide6.shapes[2].text_frame
tf6.clear()

p = tf6.paragraphs[0]
p.text = "Details / Links of the reference and research work:"
p.font.bold = True
p.font.size = Pt(16)
p.font.color.rgb = RGBColor(0, 112, 192)

add_bullet(slide6.shapes[2], "• NCRB Annual Reports (2022-2024): Cyber financial fraud distribution and latency patterns.", False, 1)
add_bullet(slide6.shapes[2], "• I4C & CFCFRMS Framework: MHA operational guidelines for digital fund tracing.", False, 1)
add_bullet(slide6.shapes[2], "• Reserve Bank of India (RBI): Security framework on withdrawal velocity and mule layering.", False, 1)
add_bullet(slide6.shapes[2], "• XGBoost Research: Chen & Guestrin (2016), Scalable Tree Boosting System (ACM SIGKDD).", False, 1)
add_bullet(slide6.shapes[2], "• Prototype Repository: Fully functional open-source codebase ready for testing.", False, 1)


# Fix the styling on all slide text to be black and properly formatted
for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame:
            for p in shape.text_frame.paragraphs:
                for run in p.runs:
                    if run.font.color.type is None:
                        run.font.color.rgb = RGBColor(0, 0, 0) # black text

# delete slide 7 (index 6) as per instructions
xml_slides = prs.slides._sldIdLst  
slides = list(xml_slides)
xml_slides.remove(slides[6])

# Save the presentation
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Final_SIH_Presentation.pptx')
prs.save(output_path)
print(f"Presentation saved to {output_path}")
