document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Fonction pour charger les versets via l'API
    async function getVersesBySurah(surahNumber) {
        try {
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar`);
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const data = await response.json();
            if (data.code === 200) {
                return data.data.ayahs.map(ayah => `<p>${ayah.text} (آية ${ayah.numberInSurah})</p>`).join('');
            }
            return '<p>لا توجد آيات متاحة</p>';
        } catch (error) {
            console.error('Erreur lors de la récupération de la sourate :', error);
            return `<p>خطأ في جلب الآيات: ${error.message}</p>`;
        }
    }

    // Approximation pour les hizb (60 ahzab sur 604 pages)
    async function getVersesByHizb(hizbNumber) {
        const pagesPerHizb = 10; // Chaque hizb couvre environ 10 pages
        const startPage = (hizbNumber - 1) * pagesPerHizb + 1;
        const endPage = startPage + pagesPerHizb - 1 > 604 ? 604 : startPage + pagesPerHizb - 1;
        let verses = [];
        try {
            for (let page = startPage; page <= endPage; page++) {
                const surah = Math.floor((page - 1) / 5) + 1;
                const ayahStart = ((page - 1) % 5) * 15 + 1;
                const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/ar`);
                if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
                const data = await response.json();
                if (data.code === 200) {
                    const ayahs = data.data.ayahs.slice(ayahStart - 1, ayahStart + 14);
                    ayahs.forEach(ayah => {
                        verses.push(`<p>${ayah.text} (سورة ${data.data.number}, آية ${ayah.numberInSurah})</p>`);
                    });
                }
            }
            return verses.length > 0 ? verses.join('') : '<p>لا توجد آيات متاحة</p>';
        } catch (error) {
            console.error('Erreur lors de la récupération du hizb :', error);
            return `<p>خطأ في جلب الآيات: ${error.message}</p>`;
        }
    }

    // Code pour la page quran.html
    if (currentPage === 'quran.html') {
        const readingModeSelect = document.getElementById('reading-mode');
        const surahSelect = document.getElementById('surah-number');
        const hizbSelect = document.getElementById('hizb-number');
        const surahContainer = document.getElementById('surah-select');
        const hizbContainer = document.getElementById('hizb-select');
        const loadBtn = document.getElementById('load-quran-btn');
        const quranText = document.getElementById('quran-text');

        // Remplir les sourates (1 à 114)
        for (let i = 1; i <= 114; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `سورة ${i}`;
            surahSelect.appendChild(option);
        }

        // Remplir les ahzab (1 à 60)
        for (let i = 1; i <= 60; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `الحزب ${i}`;
            hizbSelect.appendChild(option);
        }

        // Basculer entre mode sourate et hizb
        readingModeSelect.addEventListener('change', function() {
            if (this.value === 'surah') {
                surahContainer.classList.remove('hidden');
                hizbContainer.classList.add('hidden');
            } else {
                surahContainer.classList.add('hidden');
                hizbContainer.classList.remove('hidden');
            }
        });

        // Charger le texte du Coran
        loadBtn.addEventListener('click', async function() {
            quranText.innerHTML = '<p>جاري التحميل...</p>';
            quranText.classList.remove('hidden');
            if (readingModeSelect.value === 'surah') {
                const surahNumber = surahSelect.value;
                quranText.innerHTML = await getVersesBySurah(surahNumber);
            } else {
                const hizbNumber = hizbSelect.value;
                quranText.innerHTML = await getVersesByHizb(hizbNumber);
            }
        });
    }

    // Code pour la page wird.html
    if (currentPage === 'wird.html') {
        const dayNumberSelect = document.getElementById('day-number');
        for (let i = 1; i <= 30; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `اليوم ${i}`;
            dayNumberSelect.appendChild(option);
        }

        const calculateBtn = document.getElementById('calculate-btn');
        calculateBtn.addEventListener('click', async function() {
            const hizbCount = parseInt(document.getElementById('hizb-count').value);
            const dayNumber = parseInt(document.getElementById('day-number').value);
            
            const totalPages = 604;
            const pagesPerDay = Math.ceil(hizbCount * 10);
            
            const startPage = ((dayNumber - 1) * pagesPerDay) % totalPages + 1;
            let endPage = startPage + pagesPerDay - 1;
            if (endPage > totalPages) endPage = totalPages;
            
            const pagesPerPrayer = Math.ceil(pagesPerDay / 5);
            
            document.getElementById('wird-details').innerHTML = `
                <p>الورد اليومي: من الصفحة <strong>${startPage}</strong> إلى الصفحة <strong>${endPage}</strong></p>
                <p>عدد الصفحات: <strong>${pagesPerDay}</strong> صفحة</p>
            `;
            
            const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
            for (let i = 0; i < prayers.length; i++) {
                const prayerStartPage = startPage + (i * pagesPerPrayer);
                let prayerEndPage = prayerStartPage + pagesPerPrayer - 1;
                if (prayerEndPage > endPage) prayerEndPage = endPage;
                
                if (prayerStartPage > endPage) {
                    document.getElementById(`${prayers[i]}-wird`).innerHTML = 'لا يوجد ورد لهذه الصلاة اليوم';
                } else {
                    const verses = await getVersesByHizb(Math.ceil(prayerStartPage / 10)); // Approximation par hizb
                    document.getElementById(`${prayers[i]}-wird`).innerHTML = `
                        <p>من الصفحة <strong>${prayerStartPage}</strong> إلى الصفحة <strong>${prayerEndPage}</strong></p>
                        <div class="quran-text">${verses}</div>
                    `;
                }
            }
            
            document.getElementById('daily-wird').classList.remove('hidden');
        });
    }

    // Code pour la page prayer-times.html
    if (currentPage === 'prayer-times.html') {
        const citiesByCountry = {
            'SA': ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام'],
            'EG': ['القاهرة', 'الإسكندرية', 'الجيزة', 'شرم الشيخ', 'أسوان'],
            'AE': ['دبي', 'أبو ظبي', 'الشارقة', 'عجمان', 'رأس الخيمة'],
            'MA': ['الرباط', 'الدار البيضاء', 'مراكش', 'فاس', 'طنجة']
        };

        const countrySelect = document.getElementById('country');
        const citySelect = document.getElementById('city');

        function updateCities() {
            const selectedCountry = countrySelect.value;
            citySelect.innerHTML = '';
            citiesByCountry[selectedCountry].forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }

        countrySelect.addEventListener('change', updateCities);
        updateCities();

        const getPrayerTimesBtn = document.getElementById('get-prayer-times-btn');
        getPrayerTimesBtn.addEventListener('click', function() {
            const mockPrayerTimes = {
                'fajr': '04:30',
                'dhuhr': '12:15',
                'asr': '15:45',
                'maghrib': '18:30',
                'isha': '20:00'
            };
            
            document.getElementById('fajr-time').textContent = mockPrayerTimes.fajr;
            document.getElementById('dhuhr-time').textContent = mockPrayerTimes.dhuhr;
            document.getElementById('asr-time').textContent = mockPrayerTimes.asr;
            document.getElementById('maghrib-time').textContent = mockPrayerTimes.maghrib;
            document.getElementById('isha-time').textContent = mockPrayerTimes.isha;
            
            document.getElementById('prayer-times-display').classList.remove('hidden');
        });
    }

    // Code pour la page adhkar.html
    if (currentPage === 'adhkar.html') {
        const morningAdhkar = [
            { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ', count: 'مرة واحدة', translation: 'آية الكرسي' },
            { text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ: قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', count: '3 مرات', translation: 'سورة الإخلاص' }
        ];

        const eveningAdhkar = [
            { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ', count: 'مرة واحدة', translation: 'آية الكرسي' },
            { text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', count: 'مرة واحدة', translation: 'أذكار المساء' }
        ];

        const prayerAdhkar = [
            { text: 'سُبْحَانَ اللَّهِ', count: '33 مرة', translation: 'سبحان الله' },
            { text: 'الْحَمْدُ لِلَّهِ', count: '33 مرة', translation: 'الحمد لله' }
        ];

        function displayAdhkar(type, adhkarList) {
            const container = document.getElementById(`${type}-adhkar`);
            container.innerHTML = '';
            adhkarList.forEach(dhikr => {
                const dhikrItem = document.createElement('div');
                dhikrItem.className = 'dhikr-item';
                dhikrItem.innerHTML = `
                    <p class="dhikr-text">${dhikr.text}</p>
                    <span class="dhikr-count">${dhikr.count}</span>
                    <p class="dhikr-translation">${dhikr.translation}</p>
                `;
                container.appendChild(dhikrItem);
            });
        }

        displayAdhkar('morning', morningAdhkar);
        displayAdhkar('evening', eveningAdhkar);
        displayAdhkar('prayer', prayerAdhkar);

        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.adhkar-content').forEach(content => content.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                document.getElementById(`${tabId}-adhkar`).classList.add('active');
            });
        });
    }

    // Dark mode toggle (toutes les pages)
    const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
    if (toggleDarkModeBtn) {
        toggleDarkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            toggleDarkModeBtn.textContent = document.body.classList.contains('dark-mode') ? 'الوضع النهاري' : 'الوضع الليلي';
        });
    }
});