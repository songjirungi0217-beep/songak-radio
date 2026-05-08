'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Music, Headphones, Send, Clock } from 'lucide-react';

export default function Home() {
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [requestType, setRequestType] = useState('노래');

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    story: '',
    genre: '발라드',
    requester: '',
    is_anonymous: false
  });

  const fetchPlaylist = async () => {
    try {
      const res = await fetch('/api/requests?status=선곡&request_type=노래');
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data);
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
    const interval = setInterval(fetchPlaylist, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, request_type: requestType })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '신청 중 오류가 발생했습니다.');
      }

      setMessage({ type: 'success', text: `${requestType} 신청이 성공적으로 완료되었습니다!` });
      setFormData({
        title: '',
        artist: '',
        story: '',
        genre: '발라드',
        requester: '',
        is_anonymous: false
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>On-Air Requests</h1>
        <p>송악고등학교 방송부 노래 및 사연 신청 시스템</p>
      </header>

      <section className={`${styles.playlistSection} glass-panel`}>
        <h2 className={styles.sectionTitle}>
          <Headphones size={24} className={styles.icon} />
          오늘의 플레이리스트
        </h2>
        
        {loading ? (
          <div className={styles.emptyState}>로딩 중...</div>
        ) : playlist.length === 0 ? (
          <div className={styles.emptyState}>
            <Music size={48} opacity={0.2} style={{ margin: '0 auto 1rem', display: 'block' }} />
            아직 선곡된 노래가 없습니다.
          </div>
        ) : (
          <div className={styles.playlist}>
            {playlist.map(song => (
              <div key={song.id} className={styles.songItem}>
                <div className={styles.songInfo}>
                  <span className={styles.songTitle}>{song.title}</span>
                  <span className={styles.songArtist}>{song.artist}</span>
                </div>
                <div className={styles.songMeta}>
                  <span className={styles.songGenre}>{song.genre}</span>
                  <span className={styles.songRequester}>
                    {song.is_anonymous ? '익명' : song.requester}님 신청
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${styles.formSection} glass-panel`}>
        <div className={styles.tabs}>
          <button 
            type="button"
            className={`${styles.tab} ${requestType === '노래' ? styles.activeTab : ''}`}
            onClick={() => setRequestType('노래')}
          >
            노래 신청
          </button>
          <button 
            type="button"
            className={`${styles.tab} ${requestType === '사연' ? styles.activeTab : ''}`}
            onClick={() => setRequestType('사연')}
          >
            사연 신청
          </button>
        </div>
        
        <h2 className={styles.sectionTitle}>
          <Send size={24} className={styles.icon} />
          {requestType === '노래' ? '노래 신청하기' : '사연 신청하기'}
        </h2>
        
        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {requestType === '사연' && (
            <div className={styles.formGroup}>
              <label htmlFor="story">사연 내용 *</label>
              <textarea 
                id="story" 
                name="story" 
                className={styles.textarea} 
                required
                value={formData.story}
                onChange={handleInputChange}
                placeholder="오늘 하루 있었던 특별한 일, 친구에게 전하고 싶은 말 등 사연을 자유롭게 적어주세요!"
              ></textarea>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="title">곡 제목 {requestType === '노래' ? '*' : '(선택사항)'}</label>
              <input 
                type="text" 
                id="title" 
                name="title" 
                className={styles.input} 
                required={requestType === '노래'}
                value={formData.title}
                onChange={handleInputChange}
                placeholder="노래 제목을 입력하세요"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="artist">가수명 {requestType === '노래' ? '*' : '(선택사항)'}</label>
              <input 
                type="text" 
                id="artist" 
                name="artist" 
                className={styles.input} 
                required={requestType === '노래'}
                value={formData.artist}
                onChange={handleInputChange}
                placeholder="가수 이름을 입력하세요"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="genre">장르 {requestType === '노래' ? '*' : '(선택사항)'}</label>
              <select 
                id="genre" 
                name="genre" 
                className={styles.select}
                value={formData.genre}
                onChange={handleInputChange}
              >
                <option value="팝송">팝송</option>
                <option value="발라드">발라드</option>
                <option value="힙합">힙합</option>
                <option value="케이팝">케이팝</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="requester">신청자 이름</label>
              <input 
                type="text" 
                id="requester" 
                name="requester" 
                className={styles.input} 
                value={formData.requester}
                onChange={handleInputChange}
                placeholder="이름을 입력하세요"
                disabled={formData.is_anonymous}
                required={!formData.is_anonymous}
              />
              <label className={styles.checkboxGroup}>
                <input 
                  type="checkbox" 
                  name="is_anonymous"
                  checked={formData.is_anonymous}
                  onChange={handleInputChange}
                />
                <span>익명으로 신청하기</span>
              </label>
            </div>
          </div>

          {requestType === '노래' && (
            <div className={styles.formGroup}>
              <label htmlFor="story">남기고 싶은 말 (선택사항)</label>
              <textarea 
                id="story" 
                name="story" 
                className={styles.textarea} 
                value={formData.story}
                onChange={handleInputChange}
                placeholder="간단한 코멘트를 남겨주세요."
              ></textarea>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <>
                <Clock size={20} />
                신청 중...
              </>
            ) : (
              <>
                <Music size={20} />
                {requestType === '노래' ? '노래 신청하기' : '사연 신청하기'}
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
