
import matplotlib.pyplot as plt

# ==========================================
# ABC STOK ANALIZI
# Endustri Muhendisligi Projesi
# ==========================================

# 1. URUN VERILERI

urunler = [
    ["Rulman", 500, 120],
    ["Vida", 2000, 5],
    ["Motor", 100, 1500],
    ["Kayis", 300, 80],
    ["Sensor", 150, 400]
]

# 2. YILLIK TUKETIM DEGERLERI

analiz = []

for urun in urunler:
    isim = urun[0]
    miktar = urun[1]
    fiyat = urun[2]

    deger = miktar * fiyat
    analiz.append([isim, deger])

# 3. BUYUKTEN KUCUGE SIRALAMA

analiz.sort(key=lambda x: x[1], reverse=True)

# 4. TOPLAM TUKETIM DEGERI

toplam = sum(urun[1] for urun in analiz)

# 5. ABC SINIFLANDIRMASI

kumulatif = 0
kumulatif_yuzdeler = []
gruplar = []

print("\nABC STOK ANALIZI")
print("=" * 65)
print("Toplam Yillik Tuketim Degeri:", toplam, "TL")
print("-" * 65)

for urun in analiz:
    isim = urun[0]
    deger = urun[1]

    yuzde = (deger / toplam) * 100

    onceki_kumulatif = kumulatif
    kumulatif += yuzde

    if onceki_kumulatif < 80:
        grup = "A"
    elif onceki_kumulatif < 95:
        grup = "B"
    else:
        grup = "C"

    kumulatif_yuzdeler.append(kumulatif)
    gruplar.append(grup)

    print(
        isim,
        "|", deger, "TL",
        "| %", round(kumulatif, 2),
        "| Grup:", grup
    )

print("=" * 65)

# 6. PARETO GRAFIGI

isimler = [urun[0] for urun in analiz]
degerler = [urun[1] for urun in analiz]

fig, ax1 = plt.subplots(figsize=(11, 6))

# Sutun grafigi
ax1.bar(
    isimler,
    degerler,
    color="steelblue",
    alpha=0.85
)

ax1.set_xlabel("Urunler")
ax1.set_ylabel("Yillik Tuketim Degeri (TL)")
ax1.tick_params(axis="y")

# Kumulatif yuzde grafigi
ax2 = ax1.twinx()

ax2.plot(
    isimler,
    kumulatif_yuzdeler,
    color="red",
    marker="o",
    linewidth=2
)

ax2.set_ylabel("Kumulatif Yuzde (%)")
ax2.set_ylim(0, 110)

# ABC esik cizgileri
ax2.axhline(
    80,
    color="orange",
    linestyle="--",
    label="A Esigi (%80)"
)

ax2.axhline(
    95,
    color="green",
    linestyle="--",
    label="B Esigi (%95)"
)

ax2.legend(loc="lower right")

plt.title("ABC Stok Analizi - Pareto Grafigi")
plt.tight_layout()

# Grafigi kaydet
plt.savefig("pareto_grafigi.png", dpi=300)

# Grafigi goster
plt.show()
