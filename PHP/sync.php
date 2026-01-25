<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class SyncController
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
        $username = $data['username'] ?? '';
        $slot_type = $data['slot_type'] ?? 'log';

        // Basic validation
        if (!$username) {
            echo json_encode(['success' => false, 'message' => 'Username required']);
            return;
        }

        // Validate slot_type
        if (!in_array($slot_type, ['log', 'todo'])) {
            $slot_type = 'log';
        }

        switch ($action) {
            case 'commit':
                $this->handleCommit($username, $slot_type, $data);
                break;
            case 'checkout':
                $this->handleCheckout($username, $slot_type);
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    }

    private function handleCommit($username, $slot_type, $data)
    {
        $blackboardData = $data['data'] ?? []; // {current_draft, history: []}

        try {
            $this->pdo->beginTransaction();

            // Delete old entries for this user AND this specific slot_type only
            $stmt = $this->pdo->prepare("DELETE FROM blackboards WHERE username = ? AND slot_type LIKE ?");
            $stmt->execute([$username, $slot_type . '_%']);

            // Insert 'active_draft'
            $stmt = $this->pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, ?)");
            $stmt->execute([$username, $blackboardData['current_draft'] ?? '', $slot_type . '_active_draft']);

            // Insert 'history' items
            $history = $blackboardData['history'] ?? [];
            $stmt = $this->pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, ?)");

            foreach ($history as $content) {
                $stmt->execute([$username, $content, $slot_type . '_history']);
            }

            $this->pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Commit successful (' . $slot_type . ')']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Commit failed: ' . $e->getMessage()]);
        }
    }

    private function handleCheckout($username, $slot_type)
    {
        $stmt = $this->pdo->prepare("SELECT content, slot_type FROM blackboards WHERE username = ? AND slot_type LIKE ? ORDER BY entry_id ASC");
        $stmt->execute([$username, $slot_type . '_%']);
        $rows = $stmt->fetchAll();

        if (count($rows) === 0) {
            echo json_encode(['success' => false, 'message' => 'There have no commitment for ' . $slot_type]);
            return;
        }

        $result = [
            'current_draft' => '',
            'history' => [],
            'view_index' => 0
        ];

        foreach ($rows as $row) {
            if ($row['slot_type'] === $slot_type . '_active_draft') {
                $result['current_draft'] = $row['content'];
            } elseif ($row['slot_type'] === $slot_type . '_history') {
                $result['history'][] = $row['content'];
            }
        }

        echo json_encode(['success' => true, 'data' => $result]);
    }
}

// Initialize and Run
$controller = new SyncController($pdo);
$controller->handleRequest();
?>