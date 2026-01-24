<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? '';
$username = $data['username'] ?? '';
$slot_type = $data['slot_type'] ?? 'log'; // Default to 'log' for backward compatibility

// Basic validation 
if (!$username) {
    echo json_encode(['success' => false, 'message' => 'Username required']);
    exit;
}

// Validate slot_type (only allow 'log' or 'todo')
if (!in_array($slot_type, ['log', 'todo'])) {
    $slot_type = 'log';
}

if ($action === 'commit') {
    $blackboardData = $data['data'] ?? []; // {current_draft, history: []}

    try {
        $pdo->beginTransaction();

        // Delete old entries for this user AND this specific slot_type only
        $stmt = $pdo->prepare("DELETE FROM blackboards WHERE username = ? AND slot_type LIKE ?");
        $stmt->execute([$username, $slot_type . '_%']);

        // Insert 'active_draft' with slot_type prefix
        $stmt = $pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, ?)");
        $stmt->execute([$username, $blackboardData['current_draft'] ?? '', $slot_type . '_active_draft']);

        // Insert 'history' items with slot_type prefix
        $history = $blackboardData['history'] ?? [];
        $stmt = $pdo->prepare("INSERT INTO blackboards (username, content, slot_type) VALUES (?, ?, ?)");

        // Insert in order
        foreach ($history as $content) {
            $stmt->execute([$username, $content, $slot_type . '_history']);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Commit successful (' . $slot_type . ')']);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Commit failed: ' . $e->getMessage()]);
    }

} elseif ($action === 'checkout') {
    // Retrieve in creation order (ASC) to match frontend Stack [0..N]
    // Filter by slot_type prefix
    $stmt = $pdo->prepare("SELECT content, slot_type FROM blackboards WHERE username = ? AND slot_type LIKE ? ORDER BY entry_id ASC");
    $stmt->execute([$username, $slot_type . '_%']);
    $rows = $stmt->fetchAll();

    // Check emptiness strictly for checkout
    if (count($rows) === 0) {
        echo json_encode(['success' => false, 'message' => 'There have no commitment for ' . $slot_type]);
        exit;
    }

    $result = [
        'current_draft' => '',
        'history' => [],
        'view_index' => 0 // Reset view on checkout
    ];

    foreach ($rows as $row) {
        if ($row['slot_type'] === $slot_type . '_active_draft') {
            $result['current_draft'] = $row['content'];
        } elseif ($row['slot_type'] === $slot_type . '_history') {
            $result['history'][] = $row['content'];
        }
    }

    echo json_encode(['success' => true, 'data' => $result]);

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>