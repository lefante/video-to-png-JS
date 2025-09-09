import sys
from rembg import remove
from rembg.session_factory import new_session
import onnxruntime as ort

if len(sys.argv) < 3:
    print("Usage: python remove_bg.py <input_png> <output_png> [model] [processor]")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'u2net'
# Map user-friendly model names to rembg internal model names
model_map = {
    'u2net': 'u2net',
    'u2netp': 'u2netp',
    'silueta': 'silueta',
}
if model in model_map:
    model = model_map[model]
processor = sys.argv[4] if len(sys.argv) > 4 else 'gpu'

# Print available providers
print("Available ONNX providers:", ort.get_available_providers())

# Configure providers based on processor
if processor == 'cpu':
    providers = ['CPUExecutionProvider']
else:
    providers = ['DmlExecutionProvider', 'CPUExecutionProvider']  # Fallback to CPU

session = new_session(model, providers=providers)

# Print session info (rembg session doesn't expose providers directly)
print(f"Using model: {model}, providers: {providers}")

try:
    with open(input_path, 'rb') as i:
        input_data = i.read()
    output_data = remove(input_data, session=session)
    with open(output_path, 'wb') as o:
        o.write(output_data)
    print(f"Background removed: {input_path} -> {output_path}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
