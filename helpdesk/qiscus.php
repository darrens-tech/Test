<?php
/**
 * Qiscus ticket source.
 *
 * Live mode:  pulls customer rooms + first messages from the Qiscus
 *             Multichannel (Omnichannel) API using App ID + Secret Key.
 * Demo mode:  generates a realistic set of sample tickets (with attachment
 *             images) so the whole pipeline can run without credentials.
 */
class QiscusClient
{
    private ?string $appId;
    private ?string $secretKey;
    private string $baseUrl;

    public function __construct(?string $appId, ?string $secretKey,
                                string $baseUrl = 'https://multichannel.qiscus.com')
    {
        $this->appId     = $appId ?: null;
        $this->secretKey = $secretKey ?: null;
        $this->baseUrl   = rtrim($baseUrl, '/');
    }

    public function isConfigured(): bool
    {
        return $this->appId !== null && $this->secretKey !== null;
    }

    /**
     * Returns raw tickets:
     * [source_id, customer_name, customer_email, subject, message, created_at, images[]]
     * images: [['label' => ..., 'file' => existing path (live) or null (demo), 'tone' => ...]]
     */
    public function fetchTickets(): array
    {
        return $this->isConfigured() ? $this->fetchLive() : $this->demoTickets();
    }

    // ------------------------------------------------------------------ live
    private function fetchLive(): array
    {
        $tickets = [];
        $page    = 1;
        do {
            $resp  = $this->request('GET', "/api/v2/customer_rooms?status=unresolved&page=$page&limit=50");
            $rooms = $resp['data']['customer_rooms'] ?? $resp['data'] ?? [];
            foreach ($rooms as $room) {
                $roomId  = (string) ($room['room_id'] ?? $room['id'] ?? '');
                if ($roomId === '') {
                    continue;
                }
                $tickets[] = [
                    'source_id'      => 'QISCUS-' . $roomId,
                    'customer_name'  => $room['user_name'] ?? $room['name'] ?? 'Unknown',
                    'customer_email' => $room['user_email'] ?? null,
                    'subject'        => 'Room #' . $roomId . ' — ' . ($room['channel'] ?? 'chat'),
                    'message'        => $this->fetchRoomText($roomId) ?: (string) ($room['last_comment_text'] ?? ''),
                    'created_at'     => date('Y-m-d H:i:s', strtotime($room['created_at'] ?? 'now')),
                    'images'         => [],
                ];
            }
            $hasMore = !empty($resp['meta']['total_page']) && $page < (int) $resp['meta']['total_page'];
            $page++;
        } while ($hasMore && $page <= 10);

        return $tickets;
    }

    private function fetchRoomText(string $roomId): string
    {
        try {
            $resp = $this->request('GET', "/api/v2/rooms/$roomId/comments?limit=20");
            $parts = [];
            foreach (($resp['data']['comments'] ?? []) as $c) {
                if (($c['type'] ?? 'text') === 'text' && !empty($c['message'])) {
                    $parts[] = $c['message'];
                }
            }
            return implode("\n", array_slice($parts, 0, 6));
        } catch (Throwable) {
            return '';
        }
    }

    private function request(string $method, string $path): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Qiscus-App-Id: ' . $this->appId,
                'Qiscus-Secret-Key: ' . $this->secretKey,
                'Content-Type: application/json',
            ],
        ]);
        $body = curl_exec($ch);
        $err  = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException("Qiscus API unreachable: $err");
        }
        if ($code >= 400) {
            throw new RuntimeException("Qiscus API error HTTP $code: " . substr($body, 0, 300));
        }
        $json = json_decode($body, true);
        if (!is_array($json)) {
            throw new RuntimeException('Qiscus API returned invalid JSON');
        }
        return $json;
    }

    // ------------------------------------------------------------------ demo data
    private function demoTickets(): array
    {
        // [days_ago, customer, subject, message, image labels]
        $rows = [
            // --- recurring: AG-115 angle grinder overheating (6)
            [82, 'Budi Santoso',    'Grinder gets very hot',       'My angle grinder AG-115 becomes extremely hot after 10 minutes of cutting. There is a burning smell from the motor housing.', ['Burnt motor housing']],
            [70, 'Hendra Wijaya',   'Gerinda panas',               'Angle grinder AG-115 overheats fast, casing too hot to hold. Burning smell when grinding, sparks from vents.', ['Sparks from vent']],
            [55, 'Rudi Hartono',    'AG-115 overheating problem',  'Bought the 4.5 inch angle grinder last month. Motor overheats and smells burnt after short use. Almost burned my hand.', []],
            [41, 'Agus Salim',      'Grinder smoke',               'The angle grinder AG-115 started smoking during normal use. Motor overheat, burning smell very strong. Unit now dead.', ['Smoke damage on unit']],
            [22, 'Dewi Lestari',    'Hot grinder complaint',       'Customer complaint: gerinda AG-115 overheats within minutes, burning smell from motor. Second unit with same issue.', []],
            [6,  'Eko Prasetyo',    'Another overheating grinder', 'AG-115 grinder motor overheating again, burning smell. This is the third unit we exchanged for this customer.', ['Melted cable entry']],

            // --- recurring: CD-12V battery / charger (7)
            [78, 'Siti Rahma',      'Battery not charging',        'The battery of my cordless drill CD-12V does not charge. Charger LED stays red forever, battery completely dead.', ['Dead battery pack']],
            [66, 'Joko Susilo',     'Charger problem CD-12V',      'Cordless drill CD-12V charger not working. Battery will not charge even after 12 hours. No indicator light.', ['Charger no LED']],
            [58, 'Ahmad Fauzi',     'Baterai tidak mengisi',       'Baterai cordless drill CD-12V tidak bisa dicharge. Charger tidak berfungsi, battery dead after 2 weeks.', []],
            [47, 'Linda Kusuma',    'Drill battery dead',          'CD-12V drill battery stopped charging after one month. The charger gets warm but battery never charges to full.', ['Battery swollen']],
            [33, 'Tono Sugiarto',   'Battery issue again',         'Second battery for cordless drill CD-12V also refuses to charge. Charger seems faulty, no charge indicator.', []],
            [18, 'Rina Marlina',    'CD-12V charging failure',     'Customer returned cordless drill CD-12V, battery not charging at all. Charger output measured 0V with multimeter.', ['Charger measured 0V']],
            [4,  'Yusuf Ibrahim',   'Charger dead on arrival',     'New CD-12V cordless drill: charger dead on first use, battery cannot charge. Please advise warranty replacement.', []],

            // --- recurring: PD-800 chuck wobble (5)
            [74, 'Bambang Priyo',   'Drill chuck wobbles',         'Impact drill PD-800 chuck wobbles badly, drill bit not spinning straight. Visible runout even at low speed.', ['Chuck runout visible']],
            [61, 'Sri Wahyuni',     'Bor goyang',                  'Mata bor goyang pada impact drill PD-800. Chuck wobble, holes come out oversized. Looks like bent spindle.', []],
            [44, 'Dian Permata',    'PD-800 chuck problem',        'The chuck of impact drill PD-800 has heavy wobble from new. Bit runout around 2mm, unusable for precise work.', ['Bit runout closeup']],
            [29, 'Fajar Nugroho',   'Wobbling drill',              'Impact drill PD-800 spindle wobbles, chuck does not hold bit straight. Third complaint from our store this month.', []],
            [9,  'Wawan Setiawan',  'Drill not straight',          'PD-800 impact drill chuck wobble out of the box. Customer requesting refund, bit shakes visibly when spinning.', ['Wobble test photo']],

            // --- recurring: LL-360 laser dim (4)
            [69, 'Andi Saputra',    'Laser line very dim',         'Laser level LL-360 line is very dim, almost invisible in daylight. Much weaker than the display unit in store.', ['Dim laser line']],
            [50, 'Maya Anggraini',  'LL-360 faint laser',          'The 360 laser level projects a faint line, cannot see the laser beyond 2 meters indoors. Suspect weak diode.', []],
            [26, 'Rizky Ramadhan',  'Laser hampir tidak terlihat', 'Garis laser level LL-360 redup sekali, laser line dim and flickering. Battery is new, problem is the diode.', ['Flickering line']],
            [8,  'Putri Ayu',       'Weak laser output',           'Laser level LL-360: laser output weak and dim from first use. Not usable on site, returning the unit.', []],

            // --- recurring: GEN-2K hard start (4)
            [64, 'Slamet Riyadi',   'Generator will not start',    'Gasoline generator GEN-2K very hard to start, needs 20+ pulls. Engine dies after a few minutes under load.', ['Carburetor photo']],
            [39, 'Hasan Basri',     'Genset susah hidup',          'Genset GEN-2K susah dinyalakan, engine hard start even when warm. Fuel is fresh, spark plug replaced.', []],
            [20, 'Ari Wibowo',      'GEN-2K starting problem',     'Generator GEN-2K will not start in the morning, extremely hard start. Suspect carburetor defect from factory.', ['Fuel leak stain']],
            [3,  'Nur Aini',        'Generator dies under load',   'GEN-2K generator hard to start and shuts down when we plug in 1000W load. Engine hunting and surging.', []],

            // --- recurring: SS-108 missing pieces (4)
            [72, 'Ferry Gunawan',   'Socket set incomplete',       'Socket set SS-108 arrived with 4 sockets missing from the case: 10mm, 12mm, 14mm and the spark plug socket.', ['Empty slots in case']],
            [48, 'Ratna Sari',      'Missing sockets',             'SS-108 socket set missing pieces, the ratchet extension bar and two sockets not included in the box.', []],
            [24, 'Iwan Kurniawan',  'Kunci sok kurang',            'Socket set SS-108 kurang lengkap, missing 3 sockets and the case latch is broken. Customer very upset.', ['Broken case latch']],
            [11, 'Lia Amelia',      'Incomplete set again',        'Another SS-108 socket set with missing sockets, empty slots for 8mm and 17mm. Please check packing QC.', []],

            // --- one-offs across other products
            [80, 'Gunawan Cahyo',   'Pump leaking water',          'Water pump WP-100 leaks from the housing seal after one week. Water drips constantly even when off.', ['Seal leak']],
            [76, 'Yanti Komala',    'Helmet strap broken',         'Safety helmet SH-PRO chin strap buckle snapped on second day of use. Plastic feels brittle.', ['Snapped buckle']],
            [59, 'Doni Firmansyah', 'Saw blade guard stuck',       'Circular saw CS-185 blade guard sticks and does not retract smoothly. Dangerous when starting a cut.', []],
            [53, 'Mega Utami',      'Compressor pressure drop',    'Air compressor AC-25L loses pressure overnight, tank empty by morning. Suspect leaking check valve.', ['Pressure gauge photo']],
            [45, 'Anton Wijaksono', 'Multimeter wrong reading',    'Digital multimeter MT-D01 shows wrong voltage readings, off by 15% compared to calibrated meter.', []],
            [42, 'Fitri Handayani', 'Dented compressor tank',      'Air compressor AC-25L arrived with a large dent in the tank and scratched paint. Damaged during shipping, box was crushed.', ['Dented tank', 'Crushed box']],
            [36, 'Rahmat Hidayat',  'Torque wrench not clicking',  'Torque wrench TW-150 does not click at the set torque. Tested against another wrench, it over-torques by a lot.', []],
            [31, 'Novi Astuti',     'Gloves stitching came apart', 'Welding gloves WG-L stitching came apart at the thumb after light use. Seam quality is poor.', ['Open seam']],
            [27, 'Hari Mulyono',    'Impact wrench weak',          'Impact wrench IW-450 has very weak torque, cannot loosen wheel bolts that a cheaper unit handles fine.', []],
            [15, 'Sari Dewi',       'Pump manual missing',         'Water pump WP-100 box has no instruction manual and no warranty card. How do I register the warranty?', []],
            [13, 'Ujang Suparman',  'Saw arrived broken',          'Circular saw CS-185 base plate arrived bent and the blade was loose in the box. Packaging damaged in transit.', ['Bent base plate']],
            [2,  'Vina Oktaviani',  'Multimeter probe broken',     'Multimeter MT-D01 probe wire broke internally after a week, intermittent contact. Probes feel very thin.', ['Broken probe']],
        ];

        $tickets = [];
        foreach ($rows as $i => [$daysAgo, $customer, $subject, $message, $imageLabels]) {
            $id     = sprintf('DEMO-%04d', $i + 1);
            $email  = strtolower(str_replace(' ', '.', $customer)) . '@gmail.com';
            $images = [];
            foreach ($imageLabels as $label) {
                $images[] = ['label' => $label, 'file' => null];
            }
            $tickets[] = [
                'source_id'      => $id,
                'customer_name'  => $customer,
                'customer_email' => $email,
                'subject'        => $subject,
                'message'        => $message,
                'created_at'     => date('Y-m-d H:i:s', strtotime("-$daysAgo days") - ($i * 733) % 30000),
                'images'         => $images,
            ];
        }
        return $tickets;
    }

    /**
     * Renders a placeholder "customer photo" PNG for demo tickets (GD).
     * Returns the filename (relative to data/images).
     */
    public static function makeDemoImage(string $dir, string $sourceId, int $index, string $label): string
    {
        $w = 320;
        $h = 240;
        $img = imagecreatetruecolor($w, $h);

        // muted grey field with darker diagonal hatching, red tag, black label bar
        $bg    = imagecolorallocate($img, 235, 233, 228);
        $hatch = imagecolorallocate($img, 210, 207, 200);
        $black = imagecolorallocate($img, 20, 20, 20);
        $white = imagecolorallocate($img, 255, 255, 255);
        $red   = imagecolorallocate($img, 227, 6, 19);

        imagefilledrectangle($img, 0, 0, $w, $h, $bg);
        for ($x = -$h; $x < $w; $x += 14) {
            imageline($img, $x, $h, $x + $h, 0, $hatch);
        }
        // "object" silhouette
        srand(crc32($sourceId . $index));
        $ox = rand(40, 120);
        $oy = rand(50, 90);
        imagefilledrectangle($img, $ox, $oy, $ox + rand(90, 150), $oy + rand(60, 90), imagecolorallocate($img, 90, 90, 90));
        imagefilledellipse($img, $ox + 30, $oy + 30, 46, 46, imagecolorallocate($img, 60, 60, 60));
        // red defect marker
        $mx = $ox + rand(20, 80);
        $my = $oy + rand(10, 50);
        imagesetthickness($img, 3);
        imageellipse($img, $mx, $my, 40, 40, $red);
        imageline($img, $mx + 20, $my, $mx + 58, $my - 24, $red);
        imagesetthickness($img, 1);
        // label bar
        imagefilledrectangle($img, 0, $h - 26, $w, $h, $black);
        imagestring($img, 3, 8, $h - 21, strtoupper(substr($label, 0, 40)), $white);
        imagefilledrectangle($img, 0, $h - 26, 6, $h, $red);
        // frame
        imagerectangle($img, 0, 0, $w - 1, $h - 1, $black);

        $name = strtolower($sourceId) . '-' . ($index + 1) . '.png';
        imagepng($img, rtrim($dir, '/') . '/' . $name);
        imagedestroy($img);
        return $name;
    }
}
