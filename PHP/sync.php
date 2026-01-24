<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? '';
$username = $data['username'] ?? '';

// Basic validation 
if (!$username) {
    echo json_encode(['success' => false, 'message' => 'Username required']);
    exit;
}

if ($action === 'commit') {
    $blackboardData = $data['data'] ?? []; // {current_draft, history: []}

    try {
        $pdo->beginTransaction();

        // Delete all old entries for this user
        $stmt = $pdo->prepare("DELETE FROM blackboards WHERE username = ?");
        $stmt->execute([$username]);

        // Insert 'active_draft'
        $stmt = $pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, 'active_draft')");
        $stmt->execute([$username, $blackboardData['current_draft'] ?? '']);

        // Insert 'history' items
        $history = $blackboardData['history'] ?? [];
        $stmt = $pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, 'history')");

        // Insert in order
        foreach ($history as $content) {
            $stmt->execute([$username, $content]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Commit successful']);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Commit failed: ' . $e->getMessage()]);
    }

} elseif ($action === 'checkout') {
    // Retrieve in creation order (ASC) to match frontend Stack [0..N]
    $stmt = $pdo->prepare("SELECT content, slot_type FROM blackboards WHERE username = ? ORDER BY entry_id ASC");
    $stmt->execute([$username]);
    $rows = $stmt->fetchAll();

    // Check emptiness strictly for checkout
    if (count($rows) === 0) {
        echo json_encode(['success' => false, 'message' => 'There have no commitment']);
        exit;
    }

    $result = [
        'current_draft' => '',
        'history' => [],
        'view_index' => 0 // Reset view on checkout
    ];

    foreach ($rows as $row) {
        if ($row['slot_type'] === 'active_draft') {
            $result['current_draft'] = $row['content'];
        } elseif ($row['slot_type'] === 'history') {
            $result['history'][] = $row['content'];
        }
    }

    echo json_encode(['success' => true, 'data' => $result]);

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>