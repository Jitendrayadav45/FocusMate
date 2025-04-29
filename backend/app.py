from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)

# Configure CORS properly
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Simple in-memory storage
tasks = []

@app.route('/')
def home():
    return jsonify({"message": "Welcome to FocusMate API"})

@app.route('/tasks', methods=['GET', 'OPTIONS'])
def get_tasks():
    if request.method == 'OPTIONS':
        return '', 200
    print("GET /tasks - Current tasks:", tasks)
    return jsonify(tasks)

@app.route('/tasks', methods=['POST', 'OPTIONS'])
def add_task():
    if request.method == 'OPTIONS':
        return '', 200
    task = request.get_json()
    print("POST /tasks - Received task:", task)
    # Ensure task has timer and isRunning properties
    if 'timer' not in task:
        task['timer'] = 1500  # Default 25 minutes
    if 'isRunning' not in task:
        task['isRunning'] = False
    tasks.append(task)
    print("POST /tasks - Updated tasks:", tasks)
    return jsonify({"message": "Task added!", "task": task}), 201

@app.route('/tasks/<int:index>', methods=['DELETE', 'OPTIONS'])
def delete_task(index):
    if request.method == 'OPTIONS':
        return '', 200
    print("DELETE /tasks/{} - Current tasks:".format(index), tasks)
    if 0 <= index < len(tasks):
        deleted_task = tasks.pop(index)
        print("DELETE /tasks/{} - Updated tasks:".format(index), tasks)
        return jsonify({"message": "Task deleted!", "task": deleted_task})
    return jsonify({"error": "Invalid index"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5001)