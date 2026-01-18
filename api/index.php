<?php
// api/index.php - "Deck of Cards" Randomness + Multi-Category Fix

// Start session to memorize history
session_start();
if (!isset($_SESSION['seen_topics'])) {
    $_SESSION['seen_topics'] = [];
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dataPath = '../data/';

// --- HELPER: The "Deck of Cards" Logic ---
function pickUniqueFromPool($points, $defaultCatId = null) {
    $availableIndices = [];
    $allKeys = [];

    // 1. Identify all candidates and check against Session History
    foreach ($points as $index => $point) {
        // Use category_id inside point if available (for multi-cat), otherwise use default
        $cId = $point['category_id'] ?? $defaultCatId;
        $pId = $point['id'];
        
        // Create a unique signature: "Category-ID"
        $uniqueKey = $cId . '-' . $pId;
        $allKeys[] = $uniqueKey;

        if (!in_array($uniqueKey, $_SESSION['seen_topics'])) {
            $availableIndices[] = $index;
        }
    }

    // 2. If we have run out of new topics (Deck is empty)
    if (empty($availableIndices)) {
        // "Reshuffle": Remove these specific topics from history so they can be seen again
        $_SESSION['seen_topics'] = array_diff($_SESSION['seen_topics'], $allKeys);
        
        // Make all indices available again
        $availableIndices = array_keys($points);
    }

    // 3. Pick a random index from the Available pool
    $chosenIndex = $availableIndices[array_rand($availableIndices)];
    $chosenPoint = $points[$chosenIndex];

    // 4. Memorize this pick
    $cId = $chosenPoint['category_id'] ?? $defaultCatId;
    $uniqueKey = $cId . '-' . $chosenPoint['id'];
    
    // Add to session (re-index array to keep it clean)
    $_SESSION['seen_topics'][] = $uniqueKey;
    $_SESSION['seen_topics'] = array_values($_SESSION['seen_topics']);

    return $chosenPoint;
}

// --- DATA LOADERS ---

function loadCategories() {
    global $dataPath;
    $catFile = $dataPath . 'cat.json';
    if (!file_exists($catFile)) {
        return [];
    }
    return json_decode(file_get_contents($catFile), true);
}

function loadCategoryData($filename) {
    global $dataPath;
    $file = $dataPath . $filename;
    if (!file_exists($file)) {
        return [];
    }
    return json_decode(file_get_contents($file), true);
}

function getCategoryNameById($id) {
    $categories = loadCategories();
    foreach ($categories as $cat) {
        if ($cat['id'] == $id) {
            return $cat['name'];
        }
    }
    return 'Unknown';
}

function getCategoryFileById($id) {
    $categories = loadCategories();
    foreach ($categories as $cat) {
        if ($cat['id'] == $id) {
            return $cat['file'];
        }
    }
    return null;
}

function addCategoryInfo($point, $catId) {
    $point['category'] = getCategoryNameById($catId);
    $point['category_id'] = $catId;
    return $point;
}

// --- ENDPOINT LOGIC (Updated to use pickUniqueFromPool) ---

function randomTalk() {
    $categories = loadCategories();
    if (empty($categories)) {
        return ['error' => 'No categories found'];
    }
    
    // Pick a random category first
    $randomCat = $categories[array_rand($categories)];
    $points = loadCategoryData($randomCat['file']);
    
    if (empty($points)) {
        return ['error' => 'No points found'];
    }
    
    $randomPoint = pickUniqueFromPool($points, $randomCat['id']);
    return addCategoryInfo($randomPoint, $randomCat['id']);
}

function randomFromCategory($catId) {
    $file = getCategoryFileById($catId);
    if (!$file) {
        return ['error' => 'Category not found'];
    }
    
    $points = loadCategoryData($file);
    if (empty($points)) {
        return ['error' => 'No points found in category'];
    }
    
    // Use the smart picker
    $randomPoint = pickUniqueFromPool($points, $catId);
    return addCategoryInfo($randomPoint, $catId);
}

function randomFromMultipleCategories($catIds) {
    $allPoints = [];
    
    foreach ($catIds as $catId) {
        $file = getCategoryFileById($catId);
        if ($file) {
            $points = loadCategoryData($file);
            foreach ($points as $point) {
                $allPoints[] = addCategoryInfo($point, $catId);
            }
        }
    }
    
    if (empty($allPoints)) {
        return ['error' => 'No points found'];
    }
    
    // Smart picker (uses the embedded category_id)
    return pickUniqueFromPool($allPoints);
}

function getSpecificPoint($catId, $pointId) {
    $file = getCategoryFileById($catId);
    if (!$file) {
        return ['error' => 'Category not found'];
    }
    
    $points = loadCategoryData($file);
    foreach ($points as $point) {
        if ($point['id'] == $pointId) {
            return addCategoryInfo($point, $catId);
        }
    }
    
    return ['error' => 'Point not found'];
}

function randomFromSpecificPoints($catId, $pointIds) {
    $file = getCategoryFileById($catId);
    if (!$file) {
        return ['error' => 'Category not found'];
    }
    
    $points = loadCategoryData($file);
    $filtered = array_filter($points, function($point) use ($pointIds) {
        return in_array($point['id'], $pointIds);
    });
    
    if (empty($filtered)) {
        return ['error' => 'No matching points found'];
    }
    
    $filtered = array_values($filtered);
    $randomPoint = pickUniqueFromPool($filtered, $catId);
    return addCategoryInfo($randomPoint, $catId);
}

function randomFromMultipleCategoriesWithPoints($categoryPoints) {
    $allPoints = [];
    
    foreach ($categoryPoints as $catId => $pointIds) {
        $file = getCategoryFileById($catId);
        if ($file) {
            $points = loadCategoryData($file);
            foreach ($points as $point) {
                if (empty($pointIds) || in_array($point['id'], $pointIds)) {
                    $allPoints[] = addCategoryInfo($point, $catId);
                }
            }
        }
    }
    
    if (empty($allPoints)) {
        return ['error' => 'No points found'];
    }
    
    return pickUniqueFromPool($allPoints);
}

function searchPoints($keywords, $categoryIds = null) {
    $categories = loadCategories();
    $results = [];
    
    $keywordArray = explode('|', $keywords);
    $keywordArray = array_map('trim', $keywordArray);
    $keywordArray = array_map('strtolower', $keywordArray);
    
    $categoriesToSearch = $categoryIds ? $categoryIds : array_column($categories, 'id');
    
    foreach ($categoriesToSearch as $catId) {
        $file = getCategoryFileById($catId);
        if ($file) {
            $points = loadCategoryData($file);
            foreach ($points as $point) {
                $name = strtolower($point['name']);
                $thePoint = strtolower($point['the-point']);
                $context = strtolower($point['context']);
                
                foreach ($keywordArray as $keyword) {
                    $keyword = strtolower($keyword);
                    if (strpos($name, $keyword) !== false || 
                        strpos($thePoint, $keyword) !== false || 
                        strpos($context, $keyword) !== false) {
                        $results[] = addCategoryInfo($point, $catId);
                        break;
                    }
                }
            }
        }
    }
    
    if (empty($results)) {
        return ['error' => 'No matching points found'];
    }
    
    // Even search results should be random and unique if there are multiple matches
    return pickUniqueFromPool($results);
}

// --- MAIN ROUTING LOGIC (Parses URLs) ---

$queryString = $_SERVER['QUERY_STRING'] ?? '';
parse_str($queryString, $params);

// 1. /?talk
if (isset($params['talk']) || $queryString === 'talk') {
    echo json_encode(randomTalk());
    exit;
}

// 2. Search
if (isset($params['search'])) {
    $keywords = $params['search'];
    
    if (isset($params['mc']) && $params['mc'] === 'yes') {
        $categoryIds = [];
        $i = 1;
        while (isset($params["c$i"])) {
            $categoryIds[] = intval($params["c$i"]);
            $i++;
        }
        echo json_encode(searchPoints($keywords, $categoryIds));
    } 
    elseif (isset($params['c'])) {
        echo json_encode(searchPoints($keywords, [intval($params['c'])]));
    } 
    else {
        echo json_encode(searchPoints($keywords));
    }
    exit;
}

// 3. Complex Multi-Category (/mc=yes)
if (strpos($queryString, 'mc=yes') !== false && !isset($params['search'])) {
    $categoryPoints = [];
    $parts = explode('&&', $queryString);
    foreach ($parts as $part) {
        if (preg_match('/^c(\d+)=(.+)$/', $part, $matches)) {
            $values = $matches[2];
            $ids = explode('&', $values);
            $catId = intval($ids[0]);
            $pointIds = array_map('intval', array_slice($ids, 1));
            $categoryPoints[$catId] = $pointIds;
        }
    }
    echo json_encode(randomFromMultipleCategoriesWithPoints($categoryPoints));
    exit;
}

// 4. Standard Categories (/c=...)
if (isset($params['c'])) {
    // Specific points in single cat
    if (isset($params['p'])) {
        $catId = intval($params['c']);
        $pVal = $params['p'];
        
        if (strpos($queryString, 'p=') !== false) {
             preg_match('/p=([0-9&]+)/', $queryString, $matches);
             $pVal = $matches[1] ?? $pVal;
        }

        if (strpos($pVal, '&') !== false) {
            $pointIds = explode('&', $pVal);
            $pointIds = array_map('intval', $pointIds);
            echo json_encode(randomFromSpecificPoints($catId, $pointIds));
        } else {
            echo json_encode(getSpecificPoint($catId, intval($pVal)));
        }
        exit;
    }

    // Multiple Categories (c=1&2) or Single (c=1)
    if (preg_match('/c=([0-9&]+)/', $queryString, $matches)) {
        $cPart = $matches[1];
        if (strpos($cPart, '&') !== false) {
            $catIds = explode('&', $cPart);
            $catIds = array_map('intval', $catIds);
            echo json_encode(randomFromMultipleCategories($catIds));
        } else {
            echo json_encode(randomFromCategory(intval($cPart)));
        }
        exit;
    }
}

echo json_encode(['error' => 'Invalid request']);
?>
