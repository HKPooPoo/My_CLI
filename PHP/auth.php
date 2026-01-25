<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class AuthController
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function handleRequest()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';

        switch ($action) {
            case 'ping':
                $this->handlePing();
                break;
            case 'register':
                $this->handleRegister($data);
                break;
            case 'login':
                $this->handleLogin($data);
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    }

    private function handlePing()
    {
        echo json_encode(['success' => true, 'message' => 'Connected']);
    }

    private function handleRegister($data)
    {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (mb_strlen($username, 'UTF-8') > 69) {
            echo json_encode(['success' => false, 'message' => 'Username too long (max 69 chars)']);
            return;
        }

        // Check if user exists
        $stmt = $this->pdo->prepare("SELECT username FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Username already exists']);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        if ($stmt->execute([$username, $hash])) {
            echo json_encode(['success' => true, 'message' => 'Registration successful', 'level' => 1]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Registration failed']);
        }
    }

    private function handleLogin($data)
    {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            echo json_encode(['success' => true, 'message' => 'Login successful', 'level' => $user['level']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
    }
}

// Initialize and Run
$controller = new AuthController($pdo);
$controller->handleRequest();
?>