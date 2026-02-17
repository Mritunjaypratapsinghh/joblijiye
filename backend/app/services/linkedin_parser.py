"""LinkedIn PDF parser service."""
import re
import logging
from io import BytesIO
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)


class LinkedInParser:
    """Parse LinkedIn PDF export to extract profile data."""

    def parse(self, pdf_bytes: bytes) -> dict:
        """Parse LinkedIn PDF and extract structured data."""
        try:
            reader = PdfReader(BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            
            return self._extract_data(text)
        except Exception as e:
            logger.error(f"Failed to parse LinkedIn PDF: {e}")
            raise ValueError(f"Failed to parse PDF: {e}")

    def _extract_data(self, text: str) -> dict:
        """Extract structured data from PDF text."""
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        
        data = {
            "full_name": self._extract_name(lines),
            "location": self._extract_location(lines),
            "phone": self._extract_phone(text),
            "linkedin_url": self._extract_linkedin(text),
            "github_url": self._extract_github(text),
            "experience": self._extract_experience(text),
            "education": self._extract_education(text),
            "skills": self._extract_skills(text),
        }
        
        return data

    def _extract_name(self, lines: list[str]) -> str:
        """Extract name (usually first non-empty line)."""
        for line in lines[:5]:
            # Skip common headers
            if line.lower() in ["contact", "summary", "experience", "education"]:
                continue
            # Name is usually title case, 2-4 words
            if re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+", line):
                return line.split("\n")[0].strip()
        return ""

    def _extract_location(self, lines: list[str]) -> str:
        """Extract location from second line typically."""
        if len(lines) > 1:
            line = lines[1]
            # Match patterns like "Area, City" or "City, State"
            if "," in line and len(line) < 60:
                return line
        return ""

    def _extract_phone(self, text: str) -> str:
        """Extract phone number."""
        # Handle various formats including special chars
        patterns = [
            r"phone\+?(\d[\d\-\s]{9,14})",  # ♂phone+91-xxx
            r"\+91[\-\s]?(\d{10})",
            r"(\d{10})",
            r"\+(\d{1,3}[\-\s]?\d{10})",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                phone = re.sub(r"[^\d+]", "", match.group(0))
                if len(phone) >= 10:
                    return phone
        return ""

    def _extract_linkedin(self, text: str) -> str:
        """Extract LinkedIn URL."""
        patterns = [
            r"linkedin\.com/in/([a-zA-Z0-9\-]+)",
            r"/linkedin\s*([a-zA-Z0-9\-]+)",
            r"linkedin\s+profile",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if "linkedin.com" in match.group(0):
                    return f"https://www.{match.group(0)}"
                # Just has "Linkedin Profile" text, can't extract URL
        return ""

    def _extract_github(self, text: str) -> str:
        """Extract GitHub URL."""
        patterns = [
            r"github\.com/([a-zA-Z0-9\-]+)",
            r"/github\s*([a-zA-Z0-9\-]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if "github.com" in match.group(0):
                    return f"https://{match.group(0)}"
        return ""

    def _extract_experience(self, text: str) -> list[dict]:
        """Extract work experience."""
        experience = []
        
        # Find experience section
        exp_match = re.search(r"Experience\n(.*?)(?=Education|Skills|Technical Skills|Projects|$)", text, re.DOTALL | re.IGNORECASE)
        if not exp_match:
            return experience
        
        exp_text = exp_match.group(1)
        lines = [l.strip() for l in exp_text.split("\n") if l.strip()]
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for company line with date pattern (e.g., "Company Name July 2025 – Present")
            date_match = re.search(r"(.+?)\s+(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4}|Present)", line)
            if date_match:
                company = date_match.group(1).strip()
                start_date = date_match.group(2)
                end_date = date_match.group(3)
                
                title = ""
                location = ""
                description = ""
                
                # Next line is usually title + location
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    # Check if it's a title line (not a bullet point)
                    if not next_line.startswith("•") and not re.search(r"\d{4}", next_line):
                        # Location patterns: "City" or "New City" at end
                        loc_match = re.search(r"^(.+?)\s+((?:New\s+)?(?:Delhi|Mumbai|Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Kolkata|Gurugram|Gurgaon|Noida|Remote))$", next_line, re.IGNORECASE)
                        if loc_match:
                            title = loc_match.group(1).strip()
                            location = loc_match.group(2).strip()
                        else:
                            title = next_line
                        i += 1
                
                # Collect bullet points as description
                bullets = []
                while i + 1 < len(lines) and lines[i + 1].startswith("•"):
                    i += 1
                    bullets.append(lines[i][1:].strip())
                description = "\n".join(bullets)
                
                experience.append({
                    "company": company,
                    "title": title,
                    "location": location,
                    "start_date": self._parse_date(start_date),
                    "end_date": "" if end_date == "Present" else self._parse_date(end_date),
                    "current": end_date == "Present",
                    "description": description,
                })
            i += 1
        
        return experience[:10]

    def _extract_education(self, text: str) -> list[dict]:
        """Extract education."""
        education = []
        
        # Find education section
        edu_match = re.search(r"Education\n(.*?)(?=Skills|Experience|Certifications|Languages|$)", text, re.DOTALL | re.IGNORECASE)
        if not edu_match:
            return education
        
        edu_text = edu_match.group(1)
        lines = [l.strip() for l in edu_text.split("\n") if l.strip()]
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for institution (usually contains University, College, Institute, etc.)
            if re.search(r"University|College|Institute|School|Academy", line, re.IGNORECASE):
                institution = line
                degree = ""
                field = ""
                end_year = ""
                
                # Extract year from institution line if present
                year_match = re.search(r"(\d{4})\s*[-–]\s*(\d{4}|Present)?", institution)
                if year_match:
                    end_year = year_match.group(2) or year_match.group(1)
                    institution = re.sub(r"\s*\w+\s+\d{4}\s*[-–]\s*(\w+\s+)?\d{4}", "", institution).strip()
                
                # Next line might be degree
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    # Check if it's a degree line (contains B.Tech, Bachelor, Master, etc.)
                    if re.search(r"B\.?Tech|Bachelor|Master|M\.?Tech|MBA|PhD|Diploma|B\.?E\.|M\.?E\.|B\.?Sc|M\.?Sc", next_line, re.IGNORECASE):
                        degree_line = next_line
                        # Extract CGPA/GPA if present
                        cgpa_match = re.search(r"(CGPA|GPA)[:\s]*(\d+\.?\d*)", degree_line, re.IGNORECASE)
                        if cgpa_match:
                            degree_line = re.sub(r"\s*(CGPA|GPA)[:\s]*\d+\.?\d*", "", degree_line).strip()
                        
                        # Split degree and field
                        if " in " in degree_line:
                            parts = degree_line.split(" in ", 1)
                            degree = parts[0].strip()
                            field = parts[1].strip()
                        else:
                            degree = degree_line
                        
                        i += 1
                
                education.append({
                    "institution": institution,
                    "degree": degree,
                    "field": field,
                    "end_year": end_year,
                })
            i += 1
        
        return education[:5]

    def _extract_skills(self, text: str) -> list[str]:
        """Extract skills."""
        skills = []
        
        # Find skills section - try multiple patterns
        patterns = [
            r"Technical Skills\n(.*?)(?=Education|Experience|Projects|Certifications|$)",
            r"Top Skills\n(.*?)(?=Summary|Experience|Education|Languages|Certifications|Contact|$)",
            r"Skills\n(.*?)(?=Summary|Experience|Education|Languages|Certifications|Contact|$)",
        ]
        
        skills_text = ""
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                skills_text = match.group(1)
                break
        
        if not skills_text:
            return skills
        
        # Process each line
        for line in skills_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            
            # Skip headers
            if line.lower() in ["skills", "top skills", "other skills", "technical skills"]:
                continue
            
            # Handle "Category : skill1, skill2" format
            if ":" in line:
                parts = line.split(":", 1)
                if len(parts) > 1 and parts[1].strip():
                    for skill in self._smart_split(parts[1]):
                        skill = skill.strip()
                        if skill and 1 < len(skill) < 50:
                            skills.append(skill)
                    continue
            
            # Handle comma-separated
            if "," in line:
                for skill in self._smart_split(line):
                    skill = skill.strip()
                    if skill and 1 < len(skill) < 50:
                        skills.append(skill)
                continue
            
            # Single skill per line
            line = re.sub(r"^[-•·]\s*", "", line).strip()
            if line and 1 < len(line) < 50 and re.match(r"^[A-Za-z]", line):
                skills.append(line)
        
        return list(dict.fromkeys(skills))[:30]

    def _smart_split(self, text: str) -> list[str]:
        """Split by comma but preserve content inside parentheses."""
        result = []
        current = ""
        depth = 0
        for char in text:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            elif char == "," and depth == 0:
                if current.strip():
                    result.append(current.strip())
                current = ""
                continue
            current += char
        if current.strip():
            result.append(current.strip())
        return result

    def _parse_date(self, date_str: str) -> str:
        """Convert date string to YYYY-MM format."""
        months = {
            "jan": "01", "feb": "02", "mar": "03", "apr": "04",
            "may": "05", "jun": "06", "jul": "07", "aug": "08",
            "sep": "09", "oct": "10", "nov": "11", "dec": "12"
        }
        
        match = re.match(r"(\w+)\s*(\d{4})", date_str, re.IGNORECASE)
        if match:
            month = months.get(match.group(1)[:3].lower(), "01")
            year = match.group(2)
            return f"{year}-{month}"
        return ""


linkedin_parser = LinkedInParser()
