import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex explanation: Match '$' but NOT followed by '{'
    new_content = re.sub(r'\$(?!\{)', '₹', content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def main():
    directory = 'frontend'
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html') or file.endswith('.js') or file.endswith('.css'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
