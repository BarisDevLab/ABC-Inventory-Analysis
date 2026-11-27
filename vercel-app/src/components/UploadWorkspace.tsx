import { useLocale } from '../ui/locale';
import { useRef, useState } from 'react';
import { TemplateDownload } from './TemplateDownload';
export function UploadWorkspace({
  busy,
  name,
  onFile,
  onDemo,
  onClear,
}: {
  busy: boolean;
  name: string;
  onFile: (file: File) => void;
  onDemo: () => void;
  onClear: () => void;
}) {
  const { t } = useLocale();
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="panel upload-workspace" aria-labelledby="upload-title" aria-busy={busy}>
      <div className="panel-heading">
        <div>
          <h2 id="upload-title">{t('Verilerinizi analize dönüştürün', 'Import inventory')}</h2>
        </div>
      </div>
      <div className="upload-grid">
        <div
          className={`drop-zone ${drag ? 'dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDrag(false);
            if (!busy && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon" aria-hidden="true">
            ↥
          </span>
          <h3>{t('Excel veya CSV dosyanızı bırakın', 'Drop an Excel or CSV file')}</h3>
          <p>{t('Ya da cihazınızdan bir dosya seçin.', 'Or browse your device.')}</p>
          <input
            ref={input}
            id="inventory-file"
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = '';
            }}
            aria-label={t('Excel veya CSV dosyası seç', 'Choose an Excel or CSV file')}
          />
          <button className="button primary" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('Dosya işleniyor…', 'Processing file…') : t('Dosya seç', 'Browse files')}
          </button>
          <small>{t('.XLSX / .CSV · En fazla 20 MiB', '.XLSX / .CSV · Up to 20 MiB')}</small>
        </div>
        <div className="upload-aside">
          <span className="small-heading">{t('Önce keşfedin', 'SAMPLE AND TEMPLATE')}</span>
          <h3>{t('Dosyanız henüz hazır değil mi?', 'Try it with sample data')}</h3>
          <p>
            {t(
              'Beş ürünlü örnek veriyi inceleyin veya doğru başlıklarla boş bir şablon indirin.',
              'Explore five sample products or download a blank Excel template.',
            )}
          </p>
          <button className="button secondary" disabled={busy} onClick={onDemo}>
            {t('Örnek veriyle dene', 'Try sample data')}
          </button>
          <TemplateDownload />
          {name && (
            <div className="file-status">
              <span className="status-dot" /> <strong>{name}</strong>
              <button className="text-button" onClick={onClear}>
                {t('Analizi temizle', 'Clear analysis')}
              </button>
            </div>
          )}
        </div>
      </div>
      <details className="format-help">
        <summary>{t('Dosya biçimi ve sayı yazımı', 'File format and number entry')}</summary>
        <p>
          {t(
            'Ürün, yıllık tüketim ve birim fiyat sütunlarını eşleştirebilirsiniz. Ürün kodu seçerseniz her kod benzersiz olmalıdır.',
            'Map the product, annual usage and unit price columns. If you select an SKU column, each code must be unique.',
          )}
        </p>
        <p>
          {t(
            '1234.56 veya 1.234,56 yazabilirsiniz. Otomatik biçim 1,234 gibi belirsiz değerleri ondalık okur ve uyarır. Binlik gruplama için 1 234 veya 1.234,00 kullanın. CSV: UTF-8 / Windows Türkçe; virgül, noktalı virgül veya sekme ayracı.',
            'Use 1234.56 or 1.234,56. Automatic formatting reads ambiguous values such as 1,234 as decimals and flags them. For thousands, use 1 234 or 1,234.00. CSV supports UTF-8 or Windows Turkish with comma, semicolon, or tab delimiters.',
          )}
        </p>
      </details>
    </section>
  );
}
