<?php

namespace App\Support;

use RuntimeException;
use XMLWriter;
use ZipArchive;

class SimpleXlsxWriter
{
    private string $sheetPath;

    private XMLWriter $sheet;

    private int $rowNumber = 0;

    public function __construct()
    {
        $this->sheetPath = tempnam(sys_get_temp_dir(), 'xlsx-sheet-');

        if ($this->sheetPath === false) {
            throw new RuntimeException('Unable to create temporary XLSX sheet file.');
        }

        $this->sheet = new XMLWriter();
        $this->sheet->openUri($this->sheetPath);
        $this->sheet->startDocument('1.0', 'UTF-8', 'yes');
        $this->sheet->startElement('worksheet');
        $this->sheet->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $this->sheet->startElement('sheetData');
    }

    public function addRow(array $cells): void
    {
        $this->rowNumber++;
        $this->sheet->startElement('row');
        $this->sheet->writeAttribute('r', (string) $this->rowNumber);

        foreach (array_values($cells) as $index => $value) {
            $this->writeCell($index + 1, $value);
        }

        $this->sheet->endElement();
    }

    public function save(): string
    {
        $this->sheet->endElement();
        $this->sheet->endElement();
        $this->sheet->endDocument();
        $this->sheet->flush();

        $xlsxPath = tempnam(sys_get_temp_dir(), 'xlsx-export-');

        if ($xlsxPath === false) {
            throw new RuntimeException('Unable to create temporary XLSX file.');
        }

        $zip = new ZipArchive();

        if ($zip->open($xlsxPath, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to open temporary XLSX archive.');
        }

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
        $zip->addFromString('_rels/.rels', $this->rootRelsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelsXml());
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFile($this->sheetPath, 'xl/worksheets/sheet1.xml');
        $zip->close();

        @unlink($this->sheetPath);

        return $xlsxPath;
    }

    private function writeCell(int $columnNumber, mixed $value): void
    {
        $this->sheet->startElement('c');
        $this->sheet->writeAttribute('r', $this->columnName($columnNumber).$this->rowNumber);

        if (is_int($value) || is_float($value)) {
            $this->sheet->writeElement('v', (string) $value);
        } else {
            $this->sheet->writeAttribute('t', 'inlineStr');
            $this->sheet->startElement('is');
            $this->sheet->writeElement('t', (string) $value);
            $this->sheet->endElement();
        }

        $this->sheet->endElement();
    }

    private function columnName(int $number): string
    {
        $name = '';

        while ($number > 0) {
            $number--;
            $name = chr(65 + ($number % 26)).$name;
            $number = intdiv($number, 26);
        }

        return $name;
    }

    private function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
XML;
    }

    private function rootRelsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
XML;
    }

    private function workbookXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Results" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
XML;
    }

    private function workbookRelsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
XML;
    }

    private function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>
XML;
    }
}
