"""Text utilities."""
import re


def clean_description(text: str | None) -> str | None:
    """Clean scraped job description text."""
    if not text:
        return text
    
    # Fix common word splits from bad scraping
    fixes = {
        r'No\s*SQL': 'NoSQL',
        r'Rabbit\s*MQ': 'RabbitMQ',
        r'Java\s*Script': 'JavaScript',
        r'Type\s*Script': 'TypeScript',
        r'Git\s*Hub': 'GitHub',
        r'Git\s*Lab': 'GitLab',
        r'Bit\s*Bucket': 'Bitbucket',
        r'Mongo\s*DB': 'MongoDB',
        r'Postgre\s*SQL': 'PostgreSQL',
        r'My\s*SQL': 'MySQL',
        r'Elastic\s*Search': 'Elasticsearch',
        r'Kuber\s*netes': 'Kubernetes',
        r'Dock\s*er': 'Docker',
        r'Micro\s*soft': 'Microsoft',
        r'Linked\s*In': 'LinkedIn',
        r'Dev\s*Ops': 'DevOps',
        r'Full\s*Stack': 'Full Stack',
        r'Front\s*end': 'Frontend',
        r'Back\s*end': 'Backend',
    }
    
    for pattern, replacement in fixes.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix stuck-together words (lowercase followed by uppercase)
    text = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', text)
    
    # Fix "wordSection" patterns like "experienceJob Roles"
    sections = ['Overview', 'About', 'Description', 'Responsibilities', 'Qualifications', 
                'Requirements', 'Skills', 'Experience', 'Education', 'Benefits', 
                'Company', 'Role', 'Job', 'What', 'Who', 'Ideal', 'Required', 'Preferred']
    for section in sections:
        text = re.sub(rf'([a-z.!?])({section})', rf'\1\n\n{section}', text)
    
    # Normalize whitespace but preserve intentional line breaks
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()
