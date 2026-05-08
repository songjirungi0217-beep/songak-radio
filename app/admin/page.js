'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { CheckCircle, Play, Filter, LayoutDashboard } from 'lucide-react';

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterStatus, setFilterStatus] = useState('대기');
  const [filterType, setFilterType] = useState('all');

  const fetchRequests = async () => {
    const res = await fetch('/api/requests');
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchRequests();
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchGenre = filterGenre === 'all' || req.genre === filterGenre;
    const matchStatus = filterStatus === 'all' || req.status === filterStatus;
    const reqType = req.request_type || '노래';
    const matchType = filterType === 'all' || reqType === filterType;
    return matchGenre && matchStatus && matchType;
  });

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1><LayoutDashboard size={28} /> 관리자 대시보드</h1>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <Filter size={18} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.select}>
              <option value="all">모든 상태</option>
              <option value="대기">대기 중</option>
              <option value="선곡">선곡됨</option>
              <option value="완료">방송 완료</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.select}>
              <option value="all">모든 유형</option>
              <option value="노래">노래 신청</option>
              <option value="사연">사연 신청</option>
            </select>
            <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className={styles.select}>
              <option value="all">모든 장르</option>
              <option value="팝송">팝송</option>
              <option value="발라드">발라드</option>
              <option value="힙합">힙합</option>
              <option value="케이팝">케이팝</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>해당하는 신청 곡이 없습니다.</div>
        ) : (
          <div className={styles.grid}>
            {filteredRequests.map(req => (
              <div key={req.id} className={`glass-panel ${styles.card}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.titleWrapper}>
                    <span className={`${styles.typeBadge} ${(req.request_type || '노래') === '사연' ? styles.typeStory : styles.typeSong}`}>
                      {req.request_type || '노래'}
                    </span>
                    <div>
                      <h3 className={styles.title}>{req.title || '(노래 미지정)'}</h3>
                      {req.artist && <p className={styles.artist}>{req.artist}</p>}
                    </div>
                  </div>
                  <span className={`${styles.badge} ${styles['status-' + req.status]}`}>{req.status}</span>
                </div>
                
                <div className={styles.cardBody}>
                  <p className={styles.story}>{req.story || '사연 없음'}</p>
                  <div className={styles.metaInfo}>
                    <span className={styles.genreBadge}>{req.genre}</span>
                    <span className={styles.requester}>
                      {req.is_anonymous ? '익명' : req.requester} • {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {req.status === '대기' && (
                    <button onClick={() => updateStatus(req.id, '선곡')} className={styles.pickBtn}>
                      <Play size={16} /> 오늘의 픽 (선곡)
                    </button>
                  )}
                  {(req.status === '대기' || req.status === '선곡') && (
                    <button onClick={() => updateStatus(req.id, '완료')} className={styles.completeBtn}>
                      <CheckCircle size={16} /> 방송 완료
                    </button>
                  )}
                  {req.status === '완료' && (
                    <button onClick={() => updateStatus(req.id, '대기')} className={styles.revertBtn}>
                      대기 상태로 되돌리기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
