import { useRef,useState } from 'react';
import { TemplateDownload } from './TemplateDownload';
export function UploadWorkspace({busy,name,onFile,onDemo,onClear}:{busy:boolean;name:string;onFile:(file:File)=>void;onDemo:()=>void;onClear:()=>void}) {
  const [drag,setDrag]=useState(false);const input=useRef<HTMLInputElement>(null);
  return <section className="panel upload-workspace" aria-labelledby="upload-title" aria-busy={busy}>
    <div className="panel-heading"><div><span className="eyebrow">VERİ ÇALIŞMA ALANI</span><h2 id="upload-title">Verilerinizi analize dönüştürün</h2></div><span className="privacy-pill">◈ Yalnızca cihazınızda</span></div>
    <div className="upload-grid">
      <div className={`drop-zone ${drag?'dragging':''}`} onDragOver={event=>{event.preventDefault();if(!busy)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={event=>{event.preventDefault();setDrag(false);if(!busy&&event.dataTransfer.files[0])onFile(event.dataTransfer.files[0]);}}>
        <span className="upload-icon" aria-hidden="true">↥</span><h3>Excel veya CSV dosyanızı bırakın</h3>
        <p>Ya da cihazınızdan bir dosya seçin.</p>
        <input ref={input} id="inventory-file" type="file" accept=".csv,.xlsx" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)onFile(file);event.target.value='';}} aria-label="Excel veya CSV dosyası seç" />
        <button className="button primary" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Dosya işleniyor…':'Dosya seç'}</button>
        <small>.XLSX / .CSV · En fazla 20 MiB</small>
      </div>
      <div className="upload-aside"><span className="small-heading">Önce keşfedin</span><h3>Dosyanız henüz hazır değil mi?</h3><p>Beş ürünlü örnek veriyi inceleyin veya doğru başlıklarla boş bir şablon indirin.</p>
        <button className="button secondary" disabled={busy} onClick={onDemo}>Örnek veriyle dene</button><TemplateDownload />
        {name&&<div className="file-status"><span className="status-dot"/> <strong>{name}</strong><button className="text-button" onClick={onClear}>Analizi temizle</button></div>}
      </div>
    </div>
    <details className="format-help"><summary>Dosya biçimi ve sayı yazımı</summary><p>Ürün, Yıllık Tüketim ve Birim Fiyat (TL) başlıkları zorunludur. Her ürün tek satırda olmalıdır. Boş, negatif, geçersiz sayılar ve yinelenen ürünler kabul edilmez.</p><p>1234.56 veya 1.234,56 yazabilirsiniz. Tek başına virgül veya nokta ondalık ayracıdır: 1,234 = 1.234. Binlik gruplama için 1 234 veya 1.234,00 kullanın. CSV: UTF-8 / Windows Türkçe; virgül, noktalı virgül veya sekme ayracı.</p></details>
  </section>;
}
