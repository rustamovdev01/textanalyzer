import React, { useState, useEffect, useRef } from 'react';
import p5 from 'p5'; // Correct import for ES modules
import './TextAnalyzer.css';

interface Stats {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
}

interface Sentiment {
  description: string;
}

const TextAnalyzer: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [stats, setStats] = useState<Stats>({ wordCount: 0, charCount: 0, sentenceCount: 0 });
  const [keywords, setKeywords] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment>({ description: '' });
  const [readability, setReadability] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(localStorage.getItem('darkMode') === 'true');

  const sketchRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<p5 | null>(null);

  useEffect(() => {
    if (!sketchRef.current) return;

    const sketch = (p: p5) => {
      let stars: { x: number; y: number; size: number; speed: number }[] = [];

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.position(0, 0);
        canvas.style('z-index', '-1');
        canvas.style('position', 'fixed');
        canvas.id('background-canvas');
        for (let i = 0; i < 100; i++) {
          stars.push({ x: p.random(p.width), y: p.random(p.height), size: p.random(1, 3), speed: p.random(0.1, 0.5) });
        }
      };

      p.draw = () => {
        if (darkMode) {
          p.background(25, 25, 40, 20);
          stars.forEach(star => {
            p.fill(255);
            p.noStroke();
            p.ellipse(star.x, star.y, star.size, star.size);
            star.y += star.speed;
            if (star.y > p.height) star.y = 0;
          });
        } else {
          p.background(243, 244, 246, 20);
          let t = p.frameCount * 0.01;
          let waveHeight = 50;
          p.noStroke();
          p.fill(74, 222, 128, 50);
          p.beginShape();
          p.vertex(0, p.height);
          for (let x = 0; x <= p.width; x++) {
            let y = p.height - waveHeight + p.sin(x * 0.02 + t) * 20;
            p.vertex(x, y);
          }
          p.vertex(p.width, p.height);
          p.endShape(p.CLOSE);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        stars = [];
        for (let i = 0; i < 100; i++) {
          stars.push({ x: p.random(p.width), y: p.random(p.height), size: p.random(1, 3), speed: p.random(0.1, 0.5) });
        }
      };
    };

    p5Instance.current = new p5(sketch, sketchRef.current);

    return () => {
      p5Instance.current?.remove();
    };
  }, [darkMode]);

  const copyToClipboard = () => {
    const outputDiv = document.getElementById("outputText");
    if (outputDiv) {
      const textToCopy = Array.from(outputDiv.querySelectorAll('h3, p, li'))
        .map(el => el.textContent?.trim() || '')
        .join('\n');
      navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
          copyBtn.textContent = 'Nusxalandi!';
          setTimeout(() => {
            copyBtn.textContent = 'Nusxalash';
          }, 1000);
        }
      }).catch(() => {
        alert('Nusxalashda xatolik yuz berdi.');
      });
    }
  };

  const analyzeText = async () => {
    setLoading(true);
    setError('');
    if (!text.trim()) {
      setError("Iltimos, matn kiriting.");
      setLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;
      const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const keywords = extractKeywords(text);
      const sentiment = determineSentiment(text);
      const readability = calculateReadability(text);

      setStats({ wordCount, charCount, sentenceCount });
      setKeywords(keywords);
      setSentiment(sentiment);
      setReadability(readability);
    } catch (error: any) {
      setError(error.message.includes('fetch') ? 'Server bilan aloqa yo‘q.' : 'Xatolik: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const extractKeywords = (text: string): string[] => {
    const stopWords = new Set(['va', 'lekin', 'agar', 'bu', 'o‘z', 'uning', 'uchun', 'bo‘lgan', 'bo‘lsa', 'degan', 'ham', 'bugun', 'enda', 'keyin', 'hozir', 'bir', 'ikki', 'uch', 'men', 'sen', 'u', 'biz', 'siz', 'ular', 'shunda', 'yoki', 'shu', 'shuning', 'har', 'hamma', 'ancha', 'yaxshi', 'qanday', 'nima', 'qachon', 'nega']);
    const words = text
      .toLowerCase()
      .replace(/[.,!?;:"'()\-–—]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word) && /[a-zA-Z0-9öçşğüıÖÇŞĞÜİ]/.test(word));
    const freq: { [key: string]: number } = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
    const totalWords = Object.values(freq).reduce((sum, count) => sum + count, 0);
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
      .filter(word => (freq[word.toLowerCase()] / totalWords) * 100 > 0.5);
  };

  const calculateReadability = (text: string): string => {
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (text.replace(/\s/g, '').length / wordCount);
    return score > 80 ? "Juda Oson" : score > 60 ? "Oson" : score > 40 ? "O‘rtacha" : "Qiyin";
  };

  const determineSentiment = (text: string): Sentiment => {
    const positiveWords = ['yaxshi', 'zo‘r', 'mamnun', 'baxtli', 'muvaffaqiyat', 'xursand', 'olijon', 'quvonch', 'sog‘lom', 'sevinch', 'muhabbat', 'ilhom', 'zavq', 'o‘ynoqi', 'fayzli', 'mehr', 'hurmat', 'ezgu', 'rahmat', 'yengil', 'yuksak', 'juda', 'a’lo', 'chiroyli', 'go‘zal', 'muhim', 'foydali', 'qiziqarli', 'hayratlanarli', 'g‘urur', 'ustun', 'kuchli', 'dostlik', 'tinchlik', 'rivojlanish', 'yutuq', 'baho'];
    const negativeWords = ['yomon', 'qiyin', 'xafa', 'muammo', 'xato', 'qattiq', 'o‘lik', 'kasal', 'g‘amgin', 'qayg‘u', 'afsus', 'jahl', 'xavotir', 'tashvish', 'og‘ir', 'achchiq', 'bezovta', 'asabiy', 'noqulay', 'dahshat', 'qo‘rqinch', 'xavfli', 'kulfat', 'zulum', 'baxtsiz', 'noto‘g‘ri', 'qaltis', 'havf', 'kuchsiz', 'yolg‘iz', 'mag‘lubiyat', 'zarar', 'qo‘rquv', 'qahr', 'dushmanlik', 'uzr'];
    const neutralWords = ['masala', 'hodisa', 'fakt', 'ma’lumot', 'raqam', 'jarayon', 'natija', 'sabab', 'oqibat', 'tushuncha'];
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const posCount = words.filter(word => positiveWords.includes(word)).length;
    const negCount = words.filter(word => negativeWords.includes(word)).length;
    const neutCount = words.filter(word => neutralWords.includes(word)).length;
    const keywords = extractKeywords(text);

    let mainTopic = keywords.length > 0 ? keywords.slice(0, 2).join(' va ') : "noma'lum mavzu";
    let tone = "";
    let emotionalExpression = "";
    let contentPurpose = "";
    let intendedMessage = "";

    // Hissiyotni aniqlash
    if (posCount > negCount && posCount > neutCount) {
      tone = posCount > 3 ? "qattiq ijobiy va ilhomlantiruvchi ohangda" : "engil ijobiy ohangda";
      emotionalExpression = posCount > 3 ? "quvonch, hayrat va g‘urur kabi kuchli ijobiy his-tuyg‘ular bilan" : "mamnunlik va tinchlik kabi yumshoq ijobiy his-tuyg‘ular bilan";
      if (keywords.some(word => ['yutuq', 'muvaffaqiyat', 'rivojlanish'].includes(word.toLowerCase()))) {
        contentPurpose = "muvaffaqiyatlarni ulug‘laydi va odamlarni rag‘batlantirishga qaratilgan.";
        intendedMessage = "Bu matn o‘quvchilarga o‘z maqsadlariga erishish uchun kuch-quvvat va ishonch bag‘ishlamoqchi.";
      } else if (keywords.some(word => ['sevinch', 'muhabbat', 'dostlik'].includes(word.toLowerCase()))) {
        contentPurpose = "do‘stlik va mehr-oqibatni targ‘ib qilishga qaratilgan.";
        intendedMessage = "Matn o‘quvchilarga insoniy munosabatlarni qadrlash va sevgi tuyg‘ularini rivojlantirishni targ‘ib qilmoqchi.";
      } else {
        contentPurpose = "umumiy ijobiy ma’lumot va hayajonli voqealarni taqdim etishga qaratilgan.";
        intendedMessage = "Matn o‘quvchilarga hayotdagi yorqin jihatlarni ko‘rishga undaydi.";
      }
    } else if (negCount > posCount && negCount > neutCount) {
      tone = negCount > 3 ? "chuqur salbiy va tashvishli ohangda" : "oddiy salbiy ohangda";
      emotionalExpression = negCount > 3 ? "qayg‘u, xavotir va asabiylik kabi og‘ir his-tuyg‘ular bilan" : "afsus va noqulaylik kabi yumshoq salbiy his-tuyg‘ular bilan";
      if (keywords.some(word => ['muammo', 'xavf', 'zarar'].includes(word.toLowerCase()))) {
        contentPurpose = "muammolarni ko‘rsatish va ogohlantirishga qaratilgan.";
        intendedMessage = "Matn o‘quvchilarni muayyan xavf-xatarlar yoki muammolarga e’tibor qaratishga chorlaydi.";
      } else if (keywords.some(word => ['qayg‘u', 'afsus', 'yolg‘iz'].includes(word.toLowerCase()))) {
        contentPurpose = "his-tuyg‘ularga ta’sir qilish va qayg‘uni ifodalashga qaratilgan.";
        intendedMessage = "Matn o‘quvchilarga ichki his-tuyg‘ularini anglash va ularga qarshi kurashishga yordam bermoqchi.";
      } else {
        contentPurpose = "umumiy salbiy holatlarni bayon qilishga qaratilgan.";
        intendedMessage = "Matn o‘quvchilarga hayotdagi qiyinchiliklarni tan olishga undaydi.";
      }
    } else {
      tone = "neytral va norasmiy ohangda";
      emotionalExpression = "hech qanday aniq hissiyotni ifodalamaydi, faqat faktlar va ma’lumotlarga asoslanadi";
      contentPurpose = "ob’ektiv ma’lumot taqdim etishga qaratilgan.";
      intendedMessage = "Matn o‘quvchilarga faqat haqiqatlarni yetkazishni maqsad qilgan bo‘lib, hissiyotni boshqarishdan ko‘ra tushuncha berishga harakat qiladi.";
    }

    return {
      description: `Matn asosan ${mainTopic} mavzusiga bag‘ishlangan bo‘lib, ${tone} yozilgan. Unda ${emotionalExpression} ifodalangan. Ushbu matnning asosiy maqsadi ${contentPurpose} bo‘lib, u ${intendedMessage}.`,
    };
  };

  const clearInput = () => {
    setText('');
    setStats({ wordCount: 0, charCount: 0, sentenceCount: 0 });
    setKeywords([]);
    setSentiment({ description: '' });
    setReadability('');
    setError('');
    const textarea = document.getElementById("textInput") as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode.toString());
      return newMode;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeText();
    }
  };

  return (
    <>
      <div ref={sketchRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />
      <div className={`status-bar ${darkMode ? 'dark-mode' : ''}`}></div>
      <div className={`theme-toggle ${darkMode ? 'dark-mode' : ''}`} onClick={toggleTheme}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      </div>
      <div className={`container ${darkMode ? 'dark-mode' : ''}`}>
        <h1>Matn Tahlili</h1>
        <div className="input-wrapper">
          <textarea
            id="textInput"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
            onKeyDown={handleKeyDown} // Enter bilan ishlaydigan hodisani qo‘shdik
            placeholder="Matn kiriting (maks. 5000 belgi)..."
            maxLength={5000}
          />
          <span className={`char-counter ${text.length === 5000 ? 'limit-reached' : ''}`} id="charCounter">
            {text.length}/5000
          </span>
        </div>
        <div className="button-group">
          <button type="button" onClick={analyzeText} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Tahlil Qilish
          </button>
          <button type="button" className="clear-btn" onClick={clearInput} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Tozalash
          </button>
        </div>
        {loading && <div id="loader" className="loader" aria-busy="true"></div>}
        {error && (
          <div className="error show" id="errorText" aria-live="assertive">
            {error}
          </div>
        )}
        {stats.wordCount > 0 && (
          <div className="output show" id="outputText" aria-live="polite">
            <div className="result-card">
              <h3>Statistika</h3>
              <ul>
                <li>So‘zlar soni: {stats.wordCount}</li>
                <li>Belgilar soni: {stats.charCount}</li>
                <li>Gaplar soni: {stats.sentenceCount}</li>
              </ul>
            </div>
            <div className="result-card">
              <h3>Kalit So‘zlar</h3>
              <p>{keywords.length > 0 ? keywords.join(', ') : "Matnda hech qanday muhim kalit so‘z topilmadi"}</p>
            </div>
            <div className="result-card">
              <h3>O‘qilish Darajasi</h3>
              <p>{readability === "Juda Oson" ? "Bu matn juda oson tushunarli, boshlang‘ich darajadagi o‘quvchilar uchun ham qulay." : readability === "Oson" ? "Matn oson darajada, o‘rta darajadagi o‘quvchilar uchun mos." : readability === "O‘rtacha" ? "Matn o‘rtacha darajada, biroz diqqat talab qiladi." : "Matn qiyin, chuqur tushunish uchun katta sa’y-harakat kerak."}</p>
            </div>
            <div className="result-card">
              <h3>Matnning Mazmuni va Hissiyoti</h3>
              <p>{sentiment.description}</p>
            </div>
            <button className="copy-btn" onClick={copyToClipboard}>Nusxalash</button>
          </div>
        )}
      </div>
    </>
  );
};

export default TextAnalyzer;