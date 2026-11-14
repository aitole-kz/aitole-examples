<?php
// php php/verify_test.php
require __DIR__ . '/verify.php';

$v = json_decode(file_get_contents(__DIR__ . '/../test/vector.json'), true);
$ts = (string) $v['timestamp'];

$cases = [
    'правильная подпись принимается' => aitole_verify_webhook($v['secret'], $v['body'], $ts, $v['signature'], $v['timestamp']) === true,
    'изменённое тело отвергается' => aitole_verify_webhook($v['secret'], str_replace('4990', '1', $v['body']), $ts, $v['signature'], $v['timestamp']) === false,
    'чужой секрет отвергается' => aitole_verify_webhook('other', $v['body'], $ts, $v['signature'], $v['timestamp']) === false,
    'старый запрос отвергается' => aitole_verify_webhook($v['secret'], $v['body'], $ts, $v['signature'], $v['timestamp'] + 301) === false,
];

$failed = 0;
foreach ($cases as $name => $ok) {
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . PHP_EOL;
    $failed += $ok ? 0 : 1;
}
exit($failed ? 1 : 0);
