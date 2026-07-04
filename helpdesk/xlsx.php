<?php
/**
 * Minimal XLSX writer (no dependencies, uses ZipArchive).
 *
 * Supports: inline strings, numbers, a small fixed style set, column widths,
 * row heights, merged cells and — the part PhpSpreadsheet is usually pulled
 * in for — embedded PNG/JPEG images anchored to cells via a drawing part.
 *
 * Style indexes:
 *   0 default   1 title (16pt bold)   2 header (white on black)
 *   3 red bold  4 wrapped top-aligned 5 bold      6 top-aligned data
 */
class XlsxWriter
{
    private array $rows       = [];   // rowIdx => [colIdx => ['v'=>mixed,'s'=>int]]
    private array $rowHeights = [];   // rowIdx => points
    private array $colWidths  = [];   // colIdx => chars
    private array $merges     = [];   // ['A1:C1', ...]
    private array $images     = [];   // ['path','row','col','w','h'] px
    private int $cursor       = 0;    // next row index (0-based)

    public function setColWidths(array $widths): void
    {
        foreach ($widths as $i => $w) {
            $this->colWidths[$i] = $w;
        }
    }

    /** Appends a row. $cells: list of scalar|['v'=>..,'s'=>styleIdx]. Returns 0-based row index. */
    public function addRow(array $cells = [], int $defaultStyle = 0, ?float $height = null): int
    {
        $r = $this->cursor++;
        foreach ($cells as $c => $cell) {
            if (!is_array($cell)) {
                $cell = ['v' => $cell, 's' => $defaultStyle];
            }
            $cell += ['s' => $defaultStyle];
            if ($cell['v'] === null || $cell['v'] === '') {
                if ($cell['s'] === 0) {
                    continue;
                }
            }
            $this->rows[$r][$c] = $cell;
        }
        if ($height !== null) {
            $this->rowHeights[$r] = $height;
        }
        return $r;
    }

    public function setRowHeight(int $row, float $points): void
    {
        $this->rowHeights[$row] = $points;
    }

    public function merge(int $r1, int $c1, int $r2, int $c2): void
    {
        $this->merges[] = self::cellRef($r1, $c1) . ':' . self::cellRef($r2, $c2);
    }

    /** Anchors an image (top-left) inside a cell. $w/$h in pixels. */
    public function addImage(string $path, int $row, int $col, int $w, int $h): void
    {
        if (is_file($path)) {
            $this->images[] = ['path' => $path, 'row' => $row, 'col' => $col, 'w' => $w, 'h' => $h];
        }
    }

    public function save(string $target): void
    {
        $zip = new ZipArchive();
        if ($zip->open($target, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException("Cannot create xlsx at $target");
        }

        $hasDrawing = count($this->images) > 0;

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml($hasDrawing));
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
          . '</Relationships>');
        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
          . '<sheets><sheet name="Problem Recap" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
          . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
          . '</Relationships>');
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->sheetXml($hasDrawing));

        if ($hasDrawing) {
            $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels',
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
              . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
              . '</Relationships>');
            $zip->addFromString('xl/drawings/drawing1.xml', $this->drawingXml());
            $zip->addFromString('xl/drawings/_rels/drawing1.xml.rels', $this->drawingRelsXml());
            foreach ($this->images as $i => $img) {
                $ext = strtolower(pathinfo($img['path'], PATHINFO_EXTENSION)) === 'jpg' ? 'jpeg'
                     : strtolower(pathinfo($img['path'], PATHINFO_EXTENSION));
                $zip->addFile($img['path'], 'xl/media/image' . ($i + 1) . '.' . $ext);
            }
        }

        $zip->close();
    }

    // ------------------------------------------------------------------ parts
    private function contentTypesXml(bool $hasDrawing): string
    {
        $x  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Default Extension="png" ContentType="image/png"/>'
            . '<Default Extension="jpeg" ContentType="image/jpeg"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
        if ($hasDrawing) {
            $x .= '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>';
        }
        return $x . '</Types>';
    }

    private function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="5">'
            .   '<font><sz val="10"/><name val="Arial"/></font>'
            .   '<font><b/><sz val="16"/><name val="Arial"/></font>'
            .   '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>'
            .   '<font><b/><sz val="10"/><color rgb="FFE30613"/><name val="Arial"/></font>'
            .   '<font><b/><sz val="10"/><name val="Arial"/></font>'
            . '</fonts>'
            . '<fills count="3">'
            .   '<fill><patternFill patternType="none"/></fill>'
            .   '<fill><patternFill patternType="gray125"/></fill>'
            .   '<fill><patternFill patternType="solid"><fgColor rgb="FF000000"/><bgColor rgb="FF000000"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="2">'
            .   '<border><left/><right/><top/><bottom/><diagonal/></border>'
            .   '<border><left/><right/><top/><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border>'
            . '</borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="7">'
            .   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            .   '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
            .   '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            .   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
            .   '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            .   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>'
            . '</cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>';
    }

    private function sheetXml(bool $hasDrawing): string
    {
        $x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';

        if ($this->colWidths) {
            $x .= '<cols>';
            foreach ($this->colWidths as $i => $w) {
                $n = $i + 1;
                $x .= "<col min=\"$n\" max=\"$n\" width=\"$w\" customWidth=\"1\"/>";
            }
            $x .= '</cols>';
        }

        $x .= '<sheetData>';
        $maxRow = $this->cursor;
        for ($r = 0; $r < $maxRow; $r++) {
            $cells  = $this->rows[$r] ?? [];
            $height = $this->rowHeights[$r] ?? null;
            if (!$cells && $height === null) {
                continue;
            }
            $x .= '<row r="' . ($r + 1) . '"' . ($height !== null ? " ht=\"$height\" customHeight=\"1\"" : '') . '>';
            ksort($cells);
            foreach ($cells as $c => $cell) {
                $ref = self::cellRef($r, $c);
                $s   = (int) $cell['s'];
                $v   = $cell['v'];
                if (is_int($v) || is_float($v)) {
                    $x .= "<c r=\"$ref\" s=\"$s\"><v>$v</v></c>";
                } else {
                    $x .= "<c r=\"$ref\" s=\"$s\" t=\"inlineStr\"><is><t xml:space=\"preserve\">"
                        . htmlspecialchars((string) $v, ENT_XML1 | ENT_QUOTES, 'UTF-8')
                        . '</t></is></c>';
                }
            }
            $x .= '</row>';
        }
        $x .= '</sheetData>';

        if ($this->merges) {
            $x .= '<mergeCells count="' . count($this->merges) . '">';
            foreach ($this->merges as $m) {
                $x .= "<mergeCell ref=\"$m\"/>";
            }
            $x .= '</mergeCells>';
        }

        $x .= '<pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>';
        if ($hasDrawing) {
            $x .= '<drawing r:id="rId1"/>';
        }
        return $x . '</worksheet>';
    }

    private function drawingXml(): string
    {
        $emu = fn(int $px) => $px * 9525;
        $x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           . '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"'
           . ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
           . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
        foreach ($this->images as $i => $img) {
            $n  = $i + 1;
            $x .= '<xdr:oneCellAnchor>'
                . '<xdr:from>'
                .   '<xdr:col>' . $img['col'] . '</xdr:col><xdr:colOff>' . $emu(4) . '</xdr:colOff>'
                .   '<xdr:row>' . $img['row'] . '</xdr:row><xdr:rowOff>' . $emu(4) . '</xdr:rowOff>'
                . '</xdr:from>'
                . '<xdr:ext cx="' . $emu($img['w']) . '" cy="' . $emu($img['h']) . '"/>'
                . '<xdr:pic>'
                .   '<xdr:nvPicPr><xdr:cNvPr id="' . $n . '" name="Image ' . $n . '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
                .   '<xdr:blipFill><a:blip r:embed="rId' . $n . '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
                .   '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' . $emu($img['w']) . '" cy="' . $emu($img['h']) . '"/></a:xfrm>'
                .   '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
                . '</xdr:pic>'
                . '<xdr:clientData/>'
                . '</xdr:oneCellAnchor>';
        }
        return $x . '</xdr:wsDr>';
    }

    private function drawingRelsXml(): string
    {
        $x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        foreach ($this->images as $i => $img) {
            $ext = strtolower(pathinfo($img['path'], PATHINFO_EXTENSION));
            $ext = $ext === 'jpg' ? 'jpeg' : $ext;
            $n   = $i + 1;
            $x  .= '<Relationship Id="rId' . $n . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"'
                 . ' Target="../media/image' . $n . '.' . $ext . '"/>';
        }
        return $x . '</Relationships>';
    }

    public static function cellRef(int $row, int $col): string
    {
        $letters = '';
        $c = $col;
        do {
            $letters = chr(65 + ($c % 26)) . $letters;
            $c = intdiv($c, 26) - 1;
        } while ($c >= 0);
        return $letters . ($row + 1);
    }
}
