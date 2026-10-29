/**
 * Travel Log & Trip Planner - Main Application Logic
 */

// ==========================================
// 1. 초기 상태 및 전역 변수
// ==========================================
const STORAGE_PLACES_KEY = 'my_travel_log_places_v1';
const STORAGE_TRIPS_KEY = 'my_travel_log_trips_v1';

let places = [];
let trips = [];

let mainMode = 'trips'; // 'trips' | 'places'
let currentTripId = null; // null이면 여행 목록, ID가 있으면 해당 여행의 상세 일정 모드
let currentDay = 0; // 0 = 전체 일정, 1 = Day 1, 2 = Day 2...

let currentFilter = 'all'; // 'all' | 'visited' | 'wishlist'
let searchQuery = '';
let currentSort = 'newest';

let markersMap = {}; // id -> L.marker
let polylinesList = []; // Leaflet Polyline 레이어들

let selectedCoords = null; // { lat, lng }
let currentPhotoData = ''; // Base64 or URL

// 카테고리 정의 및 아이콘/색상
const CATEGORIES = {
  sightseeing: { name: '관광/명소', icon: 'fa-landmark', color: '#3b82f6' },
  hotel: { name: '숙소/호텔', icon: 'fa-hotel', color: '#8b5cf6' },
  restaurant: { name: '맛집/카페', icon: 'fa-utensils', color: '#f97316' },
  shopping: { name: '쇼핑/액티비티', icon: 'fa-bag-shopping', color: '#ec4899' },
  transport: { name: '교통/이동', icon: 'fa-plane', color: '#06b6d4' },
  custom: { name: '직접입력', icon: 'fa-location-dot', color: '#64748b' }
};

const DAY_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

// Leaflet 맵 인스턴스
let map = null;
let currentTileLayer = null;
const tileProviders = {
  googleRoads: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}',
    options: { subdomains: '0123', maxZoom: 20, attribution: '&copy; Google Maps' }
  },
  googleHybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&hl=ko&x={x}&y={y}&z={z}',
    options: { subdomains: '0123', maxZoom: 20, attribution: '&copy; Google Maps' }
  },
  googleTerrain: {
    url: 'https://mt{s}.google.com/vt/lyrs=p&hl=ko&x={x}&y={y}&z={z}',
    options: { subdomains: '0123', maxZoom: 20, attribution: '&copy; Google Maps' }
  },
  street: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 18, attribution: 'Tiles &copy; Esri' }
  }
};

// ==========================================
// 2. 초기 샘플 데이터 (여행 코스 & 단일 핀)
// ==========================================
const SAMPLE_TRIPS = [
  {
    id: 'sample-trip-1',
    type: 'visited',
    name: '2박 3일 서울 감성 & 미식 힐링 투어',
    destination: '대한민국 서울',
    startDate: '2024-10-18',
    endDate: '2024-10-20',
    budget: '약 45만원',
    description: '고궁의 가을 정취를 만끽하고 광화문과 성수동 핫플레이스를 돌아본 알찬 2박 3일 힐링 코스였습니다.',
    tags: ['서울', '호캉스', '고궁', '성수동', '미식'],
    photo: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=80',
    daysCount: 3,
    createdAt: 1729200000000,
    spots: [
      // Day 1
      {
        id: 'spot-1-1',
        day: 1,
        order: 1,
        name: '포시즌스 호텔 서울',
        category: 'hotel',
        lat: 37.5707,
        lng: 126.9757,
        time: '14:00',
        cost: '320,000원',
        notes: '얼리 체크인 후 짐 보관, 웰컴 티 마시기',
        photo: ''
      },
      {
        id: 'spot-1-2',
        day: 1,
        order: 2,
        name: '경복궁 & 경회루',
        category: 'sightseeing',
        lat: 37.5796,
        lng: 126.9770,
        time: '15:30',
        cost: '3,000원',
        notes: '가을 단풍과 경회루 연못 야경 감상',
        photo: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'spot-1-3',
        day: 1,
        order: 3,
        name: '삼청동 수제비 & 전통찻집',
        category: 'restaurant',
        lat: 37.5855,
        lng: 126.9825,
        time: '18:00',
        cost: '24,000원',
        notes: '항아리 수제비와 감자전, 따뜻한 대추차',
        photo: ''
      },
      // Day 2
      {
        id: 'spot-2-1',
        day: 2,
        order: 1,
        name: '북촌 한옥마을 산책',
        category: 'sightseeing',
        lat: 37.5826,
        lng: 126.9859,
        time: '10:30',
        cost: '0원',
        notes: '조용한 골목길 산책과 남산타워 뷰 포토존',
        photo: ''
      },
      {
        id: 'spot-2-2',
        day: 2,
        order: 2,
        name: '광장시장 먹거리 투어',
        category: 'restaurant',
        lat: 37.5700,
        lng: 126.9996,
        time: '13:00',
        cost: '28,000원',
        notes: '순희네 빈대떡과 마약김밥, 육회 탕탕이',
        photo: ''
      },
      {
        id: 'spot-2-3',
        day: 2,
        order: 3,
        name: 'N서울타워 & 남산 케이블카',
        category: 'sightseeing',
        lat: 37.5512,
        lng: 126.9882,
        time: '17:30',
        cost: '30,000원',
        notes: '케이블카 타고 올라가서 서울 전체 일몰 및 야경 조망',
        photo: ''
      },
      // Day 3
      {
        id: 'spot-3-1',
        day: 3,
        order: 1,
        name: '성수동 카페거리 (대림창고)',
        category: 'restaurant',
        lat: 37.5435,
        lng: 127.0543,
        time: '11:00',
        cost: '18,000원',
        notes: '인더스트리얼 감성 갤러리 카페에서 브런치',
        photo: ''
      },
      {
        id: 'spot-3-2',
        day: 3,
        order: 2,
        name: '서울숲 산책 & 피크닉',
        category: 'sightseeing',
        lat: 37.5444,
        lng: 127.0374,
        time: '14:00',
        cost: '5,000원',
        notes: '은행나무 숲길 걷기 및 힐링',
        photo: ''
      }
    ]
  },
  {
    id: 'sample-trip-2',
    type: 'wishlist',
    name: '3박 4일 도쿄 트렌드 & 미식 탐방',
    destination: '일본 도쿄',
    startDate: '2026-03-25',
    endDate: '2026-03-28',
    budget: '약 150만원',
    description: '시부야 스카이와 긴자 쇼핑, 신주쿠의 골든가이 야경을 즐기는 벚꽃 시즌 도쿄 여행 계획입니다.',
    tags: ['일본', '도쿄', '벚꽃', '쇼핑', '미식'],
    photo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    daysCount: 3,
    createdAt: 1729300000000,
    spots: [
      {
        id: 'spot-t2-1',
        day: 1,
        order: 1,
        name: '시부야 스카이 (SHIBUYA SKY)',
        category: 'sightseeing',
        lat: 35.6585,
        lng: 139.7013,
        time: '16:00',
        cost: '2,200엔',
        notes: '일몰 타임 사전 예약 필수! 스크램블 교차로 한눈에 보기',
        photo: ''
      },
      {
        id: 'spot-t2-2',
        day: 1,
        order: 2,
        name: '신주쿠 워싱턴 호텔',
        category: 'hotel',
        lat: 35.6865,
        lng: 139.6934,
        time: '19:00',
        cost: '18,000엔',
        notes: '역에서 접근성 좋은 가성비 숙소',
        photo: ''
      },
      {
        id: 'spot-t2-3',
        day: 2,
        order: 1,
        name: '츠키지 장외시장 스시',
        category: 'restaurant',
        lat: 35.6655,
        lng: 139.7708,
        time: '09:30',
        cost: '4,000엔',
        notes: '신선한 참치 덮밥과 계란말이 맛보기',
        photo: ''
      },
      {
        id: 'spot-t2-4',
        day: 2,
        order: 2,
        name: '긴자 식스 & 명품거리 쇼핑',
        category: 'shopping',
        lat: 35.6696,
        lng: 139.7640,
        time: '13:00',
        cost: '예산 미정',
        notes: '옥상 정원 및 츠타야 서점 구경',
        photo: ''
      }
    ]
  }
];

const SAMPLE_PLACES = [
  {
    id: 'sample-p1',
    type: 'visited',
    name: '파리 에펠탑 & 센강 유람선',
    country: '프랑스 파리',
    lat: 48.8584,
    lng: 2.2945,
    visitedDate: '2024-05-12',
    rating: 5,
    notes: '에펠탑의 반짝이는 야경과 센강 바토무슈 유람선 위에서 마신 와인이 최고였습니다.',
    highlights: '바토무슈 유람선, 샤요궁 야경 뷰',
    tags: ['유럽', '낭만', '야경명소'],
    photo: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
    createdAt: 1715472000000
  },
  {
    id: 'sample-p2',
    type: 'wishlist',
    name: '스위스 융프라우 & 인터라켄',
    country: '스위스 인터라켄',
    lat: 46.5475,
    lng: 7.9824,
    targetDate: '2026년 여름',
    budget: '약 400만원',
    wishReason: '알프스의 지붕 융프라우요흐에 직접 올라가 만년설과 패러글라이딩을 즐기고 싶습니다.',
    checklist: [
      { text: '스위스 트래블 패스 조기 예매', done: false },
      { text: '인터라켄 패러글라이딩 예약', done: false }
    ],
    tags: ['알프스', '버킷리스트', '대자연'],
    photo: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
    createdAt: 1718000000000
  }
];

// ==========================================
// 3. 앱 초기화 (DOM Ready)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initMap();
  setupEvents();
  updateUI();

  if (trips.length === 0 && places.length === 0) {
    loadSampleData(true);
  }
});

// ==========================================
// 4. 지도 (Leaflet) 초기화 및 제어
// ==========================================
function initMap() {
  map = L.map('map', {
    center: [37.5665, 126.9780], // 기본 서울 중심
    zoom: 6,
    minZoom: 2,
    worldCopyJump: true,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 기본 최신 구글 맵 세팅
  setTileLayer('googleRoads');

  // 지도 클릭 이벤트
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    selectedCoords = { lat, lng };

    // 1) 여행 상세 모드일 때는 해당 여행의 현재 Day에 스팟 추가
    if (currentTripId) {
      const activeTrip = trips.find(t => t.id === currentTripId);
      const targetDay = currentDay > 0 ? currentDay : 1;
      
      const geoInfo = await reverseGeocode(lat, lng);
      openSpotModal({
        tripId: currentTripId,
        day: targetDay,
        name: geoInfo.name || '',
        lat,
        lng
      });
      return;
    }

    // 2) 일반 목록 모드일 때는 단일 장소 추가 모달 오픈
    const geoInfo = await reverseGeocode(lat, lng);
    openPlaceModal({
      lat,
      lng,
      name: geoInfo.name || '',
      country: geoInfo.country || ''
    });
  });
}

function setTileLayer(theme) {
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
  }

  const provider = tileProviders[theme] || tileProviders.googleRoads;
  currentTileLayer = L.tileLayer(provider.url, provider.options).addTo(map);

  document.querySelectorAll('.map-theme-selector .map-ctrl-btn').forEach(btn => btn.classList.remove('active'));
  let btnId = `btn-theme-${theme}`;
  if (theme === 'googleRoads') btnId = 'btn-theme-google-roads';
  if (theme === 'googleHybrid') btnId = 'btn-theme-google-hybrid';
  if (theme === 'googleTerrain') btnId = 'btn-theme-google-terrain';
  if (theme === 'street') btnId = 'btn-theme-street';

  const activeBtn = document.getElementById(btnId);
  if (activeBtn) activeBtn.classList.add('active');
}

// ==========================================
// 5. 마커 & 동선(Polyline) 렌더링
// ==========================================
function clearMapOverlays() {
  // 마커 제거
  Object.values(markersMap).forEach(marker => map.removeLayer(marker));
  markersMap = {};

  // Polyline 제거
  polylinesList.forEach(line => map.removeLayer(line));
  polylinesList = [];
}

function renderMap() {
  clearMapOverlays();

  // 1) 특정 여행 상세 일정 모드일 때
  if (currentTripId) {
    renderTripDetailMap();
    return;
  }

  // 2) 단일 장소(Places) 탭 모드일 때
  if (mainMode === 'places') {
    renderPlacesMap();
    return;
  }

  // 3) 전체 여행 코스(Trips) 탭 모드일 때
  renderTripsOverviewMap();
}

// 특정 여행의 상세 스팟과 일자별 동선 선 렌더링
function renderTripDetailMap() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  const spots = trip.spots || [];
  // 선택된 Day 필터링 (0이면 전체)
  const displaySpots = currentDay === 0 ? spots : spots.filter(s => s.day === currentDay);

  if (displaySpots.length === 0) return;

  const latlngsByDay = {}; // day -> [[lat, lng], ...]
  const bounds = [];

  // 스팟 번호 순서대로 정렬
  displaySpots.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return (a.order || 0) - (b.order || 0);
  });

  displaySpots.forEach((spot, idx) => {
    if (spot.lat == null || spot.lng == null) return;

    bounds.push([spot.lat, spot.lng]);

    if (!latlngsByDay[spot.day]) {
      latlngsByDay[spot.day] = [];
    }
    latlngsByDay[spot.day].push([spot.lat, spot.lng]);

    // 카테고리 정보
    const cat = CATEGORIES[spot.category] || CATEGORIES.custom;
    const catClass = spot.category || 'custom';
    const dayColor = DAY_COLORS[(spot.day - 1) % DAY_COLORS.length];

    // 번호 핀 커스텀 마커
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="trip-spot-marker">
          <div class="spot-marker-bubble ${catClass}" style="border-color:${dayColor};">
            <span>D${spot.day}-${spot.order || (idx + 1)}</span>
            <i class="fa-solid ${cat.icon}"></i>
          </div>
        </div>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 15],
      popupAnchor: [0, -16]
    });

    const marker = L.marker([spot.lat, spot.lng], { icon: customIcon }).addTo(map);

    // 팝업 내용
    const catName = spot.category === 'custom' && spot.customCategoryName ? spot.customCategoryName : cat.name;
    let photoHtml = spot.photo ? `<img src="${escapeHtml(spot.photo)}" style="width:100%; height:110px; object-fit:cover; border-radius:6px; margin-bottom:6px;">` : '';

    marker.bindPopup(`
      <div style="width:230px; font-family:inherit;">
        ${photoHtml}
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:11px; font-weight:700; color:${dayColor};">Day ${spot.day} &middot; #${spot.order}</span>
          <span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:600;">${escapeHtml(catName)}</span>
        </div>
        <h4 style="font-size:15px; margin:0 0 4px 0; color:#0f172a;">${escapeHtml(spot.name)}</h4>
        ${spot.time ? `<div style="font-size:12px; color:#2563eb; margin-bottom:2px;"><i class="fa-regular fa-clock"></i> ${escapeHtml(spot.time)}</div>` : ''}
        ${spot.cost ? `<div style="font-size:12px; color:#059669; margin-bottom:4px;"><i class="fa-solid fa-coins"></i> ${escapeHtml(spot.cost)}</div>` : ''}
        ${spot.notes ? `<p style="font-size:12px; color:#475569; margin:4px 0 8px 0; line-height:1.4;">${escapeHtml(spot.notes)}</p>` : ''}
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button class="btn btn-outline btn-sm" style="flex:1;" onclick="app.openEditSpotModal('${trip.id}', '${spot.id}')">수정</button>
          <button class="btn btn-danger-outline btn-sm" style="flex:1;" onclick="app.deleteSpot('${trip.id}', '${spot.id}')">삭제</button>
        </div>
      </div>
    `);

    markersMap[spot.id] = marker;
  });

  // Day별 동선 Polyline(선) 그리기
  Object.keys(latlngsByDay).forEach(dayNum => {
    const coords = latlngsByDay[dayNum];
    if (coords.length < 2) return;

    const color = DAY_COLORS[(parseInt(dayNum) - 1) % DAY_COLORS.length];
    const polyline = L.polyline(coords, {
      color: color,
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      lineJoin: 'round'
    }).addTo(map);

    polylinesList.push(polyline);
  });

  // 모든 스팟이 한눈에 들어오도록 줌 맞춤
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

// 전체 여행 목록 상태에서 지도에 각 여행 대표 핀 표시
function renderTripsOverviewMap() {
  const filteredTrips = getFilteredTrips();
  const bounds = [];

  filteredTrips.forEach(trip => {
    // 첫 번째 스팟 좌표나 저장된 위치 사용
    let lat = null;
    let lng = null;

    if (trip.spots && trip.spots.length > 0) {
      lat = trip.spots[0].lat;
      lng = trip.spots[0].lng;
    }

    if (lat == null || lng == null) return;

    bounds.push([lat, lng]);

    const isVisited = trip.type === 'visited';
    const iconClass = isVisited ? 'visited' : 'wishlist';

    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="marker-pin ${iconClass}">
          <i class="fa-solid fa-suitcase-rolling"></i>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    const count = (trip.spots || []).length;

    marker.bindPopup(`
      <div style="width:220px; font-family:inherit;">
        <span class="place-badge ${iconClass}" style="margin-bottom:4px;">${isVisited ? '다녀온 여행' : '갈 예정'}</span>
        <h4 style="font-size:15px; margin:4px 0 2px 0;">${escapeHtml(trip.name)}</h4>
        <div style="font-size:12px; color:#64748b; margin-bottom:6px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(trip.destination)}</div>
        <div style="font-size:12px; color:#3b82f6; font-weight:700; margin-bottom:8px;">총 ${count}개의 여행 장소 등록됨</div>
        <button class="btn btn-primary btn-sm btn-block" onclick="app.enterTripView('${trip.id}')">
          <i class="fa-solid fa-route"></i> 일정 및 동선 보기
        </button>
      </div>
    `);

    markersMap[trip.id] = marker;
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }
}

// 단일 장소 모드 맵 렌더링
function renderPlacesMap() {
  const filtered = getFilteredPlaces();
  const bounds = [];

  filtered.forEach(place => {
    if (place.lat == null || place.lng == null) return;
    bounds.push([place.lat, place.lng]);

    const isVisited = place.type === 'visited';
    const iconClass = isVisited ? 'visited' : 'wishlist';
    const iconSymbol = isVisited ? 'fa-plane-arrival' : 'fa-compass';

    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div class="marker-pin ${iconClass}"><i class="fa-solid ${iconSymbol}"></i></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div class="popup-card" style="width:240px;">
        <h4 style="font-size:15px; margin-bottom:4px;">${escapeHtml(place.name)}</h4>
        <div style="font-size:12px; color:#64748b; margin-bottom:6px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(place.country || '')}</div>
        <div class="popup-actions">
          <button class="btn btn-primary btn-sm" onclick="app.viewPlaceDetail('${place.id}')">상세보기</button>
          <button class="btn btn-outline btn-sm" onclick="app.openEditPlaceModal('${place.id}')">수정</button>
        </div>
      </div>
    `);

    markersMap[place.id] = marker;
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }
}

// ==========================================
// 6. 여행 코스 (Trip) 관리 로직
// ==========================================
function enterTripView(tripId) {
  currentTripId = tripId;
  currentDay = 0; // 0 = 전체 일정

  const trip = trips.find(t => t.id === tripId);
  if (!trip) return;

  // 사이드바 뷰 전환
  document.getElementById('sidebar-view-list').style.display = 'none';
  document.getElementById('sidebar-view-trip').style.display = 'flex';

  // 상단 활성 배너 표시
  const banner = document.getElementById('trip-active-banner');
  banner.style.display = 'flex';
  document.getElementById('active-banner-title').textContent = trip.name;
  document.getElementById('active-banner-day').textContent = '[전체 일정]';

  renderTripDetailView();
  renderMap();
}

function exitTripView() {
  currentTripId = null;
  currentDay = 0;

  document.getElementById('sidebar-view-trip').style.display = 'none';
  document.getElementById('sidebar-view-list').style.display = 'flex';
  document.getElementById('trip-active-banner').style.display = 'none';

  renderMap();
  updateUI();
}

function setTripDay(dayNum) {
  currentDay = dayNum;

  // Day 탭 활성화 클래스
  document.querySelectorAll('.day-tab-chip').forEach(tab => {
    if (parseInt(tab.dataset.day) === dayNum) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  // 상단 배너 텍스트 갱신
  document.getElementById('active-banner-day').textContent = dayNum === 0 ? '[전체 일정]' : `[Day ${dayNum}]`;

  renderSpotsTimeline();
  renderMap();
}

function renderTripDetailView() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  const isVisited = trip.type === 'visited';
  const badge = document.getElementById('trip-detail-badge');
  badge.className = `badge-type ${isVisited ? 'visited' : 'wishlist'}`;
  badge.textContent = isVisited ? '✈️ 다녀온 여행' : '🌟 갈 예정인 여행';

  document.getElementById('trip-detail-title').textContent = trip.name;

  const datesText = (trip.startDate || trip.endDate) ? `${trip.startDate || ''} ~ ${trip.endDate || ''}` : '일정 미지정';
  document.getElementById('trip-detail-dates').textContent = datesText;
  document.getElementById('trip-detail-loc').textContent = trip.destination || '위치 미지정';

  // Day 탭 렌더링
  renderDayTabs(trip.daysCount || 3);
  renderSpotsTimeline();
}

function renderDayTabs(daysCount) {
  const container = document.getElementById('day-tabs-container');
  let html = `
    <button class="day-tab-chip ${currentDay === 0 ? 'active' : ''}" data-day="0" onclick="app.setTripDay(0)">
      전체 일정
    </button>
  `;

  for (let d = 1; d <= daysCount; d++) {
    html += `
      <button class="day-tab-chip ${currentDay === d ? 'active' : ''}" data-day="${d}" onclick="app.setTripDay(${d})">
        Day ${d}
      </button>
    `;
  }

  container.innerHTML = html;
}

function addNewDayToTrip() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  trip.daysCount = (trip.daysCount || 1) + 1;
  saveData();
  renderDayTabs(trip.daysCount);
  setTripDay(trip.daysCount);
  showToast(`Day ${trip.daysCount} 일정이 추가되었습니다.`, 'success');
}

function renderSpotsTimeline() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  const spots = trip.spots || [];
  const container = document.getElementById('spots-timeline-list');
  const summaryBanner = document.getElementById('day-summary-banner');

  // 필터링
  const filteredSpots = currentDay === 0 ? spots : spots.filter(s => s.day === currentDay);

  summaryBanner.innerHTML = `
    <span>${currentDay === 0 ? '전체 일정 타임라인' : `Day ${currentDay} 타임라인`}</span>
    <span class="day-spots-count">${filteredSpots.length}개 장소</span>
  `;

  if (filteredSpots.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-map-pin"></i>
        <p>${currentDay === 0 ? '등록된 장소가 없습니다.' : `Day ${currentDay}에 등록된 장소가 없습니다.`}</p>
        <small>하단의 '+ 장소 추가' 버튼이나 지도를 클릭하여 장소를 추가해보세요!</small>
      </div>
    `;
    return;
  }

  // 정렬 (Day순, Order순)
  filteredSpots.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return (a.order || 0) - (b.order || 0);
  });

  container.innerHTML = filteredSpots.map((spot, idx) => {
    const cat = CATEGORIES[spot.category] || CATEGORIES.custom;
    const catClass = spot.category || 'custom';
    const catName = spot.category === 'custom' && spot.customCategoryName ? spot.customCategoryName : cat.name;

    return `
      <div class="spot-timeline-card" id="spot-card-${spot.id}">
        <div class="spot-order-pin ${catClass}" title="${catName}">
          ${spot.order || (idx + 1)}
        </div>

        <div class="spot-card-inner" onclick="app.focusSpot('${spot.id}')">
          <div class="spot-card-header">
            <h4 class="spot-card-title">${escapeHtml(spot.name)}</h4>
            <span class="spot-chip" style="font-size:10px;">${escapeHtml(catName)}</span>
          </div>

          <div class="spot-card-chips">
            ${spot.time ? `<span class="spot-chip time"><i class="fa-regular fa-clock"></i> ${escapeHtml(spot.time)}</span>` : ''}
            ${spot.cost ? `<span class="spot-chip cost"><i class="fa-solid fa-coins"></i> ${escapeHtml(spot.cost)}</span>` : ''}
          </div>

          ${spot.notes ? `<p class="spot-card-notes">${escapeHtml(spot.notes)}</p>` : ''}

          <div class="spot-card-actions" onclick="event.stopPropagation()">
            <button class="btn-icon" title="순서 위로" onclick="app.moveSpotOrder('${trip.id}', '${spot.id}', -1)"><i class="fa-solid fa-arrow-up"></i></button>
            <button class="btn-icon" title="순서 아래로" onclick="app.moveSpotOrder('${trip.id}', '${spot.id}', 1)"><i class="fa-solid fa-arrow-down"></i></button>
            <button class="btn-icon" title="수정" onclick="app.openEditSpotModal('${trip.id}', '${spot.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon danger" title="삭제" onclick="app.deleteSpot('${trip.id}', '${spot.id}')"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function focusSpot(spotId) {
  // 모바일 화면에서는 스팟 클릭 시 지도로 전환하여 보여줌
  if (window.innerWidth <= 768) {
    setMobileActiveTab('map');
  }

  const marker = markersMap[spotId];
  if (marker) {
    map.flyTo(marker.getLatLng(), 15, { duration: 0.8 });
    setTimeout(() => marker.openPopup(), 400);
  }
}

function moveSpotOrder(tripId, spotId, direction) {
  const trip = trips.find(t => t.id === tripId);
  if (!trip) return;

  const spots = trip.spots || [];
  const targetSpot = spots.find(s => s.id === spotId);
  if (!targetSpot) return;

  // 같은 Day 내의 스팟들만 추출
  const daySpots = spots.filter(s => s.day === targetSpot.day).sort((a, b) => (a.order || 0) - (b.order || 0));
  const currentIndex = daySpots.findIndex(s => s.id === spotId);
  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= daySpots.length) return;

  // 교환
  const temp = daySpots[currentIndex].order;
  daySpots[currentIndex].order = daySpots[targetIndex].order;
  daySpots[targetIndex].order = temp;

  saveData();
  renderSpotsTimeline();
  renderMap();
}

// ==========================================
// 7. 여행 & 스팟 모달 CRUD
// ==========================================
function openTripModal(tripData = {}) {
  const form = document.getElementById('form-trip');
  form.reset();

  const isEdit = !!tripData.id;
  document.getElementById('modal-trip-title').textContent = isEdit ? '여행 코스 수정' : '새 여행 만들기';
  document.getElementById('trip-id').value = tripData.id || '';

  const tripType = tripData.type || 'visited';
  form.elements['tripType'].value = tripType;

  document.getElementById('trip-name').value = tripData.name || '';
  document.getElementById('trip-destination').value = tripData.destination || '';
  document.getElementById('trip-start-date').value = tripData.startDate || '';
  document.getElementById('trip-end-date').value = tripData.endDate || '';
  document.getElementById('trip-budget').value = tripData.budget || '';
  document.getElementById('trip-description').value = tripData.description || '';
  document.getElementById('trip-tags').value = (tripData.tags || []).join(', ');

  currentPhotoData = tripData.photo || '';
  updatePhotoPreviewGeneric('trip-photo-preview-box', 'img-trip-photo-preview', currentPhotoData);
  document.getElementById('input-trip-photo-url').value = (currentPhotoData.startsWith('http')) ? currentPhotoData : '';

  document.getElementById('modal-trip').style.display = 'flex';
}

function handleTripFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('trip-id').value;
  const type = document.querySelector('input[name="tripType"]:checked').value;
  const name = document.getElementById('trip-name').value.trim();
  const destination = document.getElementById('trip-destination').value.trim();
  const startDate = document.getElementById('trip-start-date').value;
  const endDate = document.getElementById('trip-end-date').value;
  const budget = document.getElementById('trip-budget').value.trim();
  const description = document.getElementById('trip-description').value.trim();
  const rawTags = document.getElementById('trip-tags').value;
  const tags = rawTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0);

  if (!name || !destination) {
    alert('여행 제목과 대표 도시를 입력해주세요.');
    return;
  }

  // 일자 차이 계산으로 daysCount 자동 설정
  let daysCount = 3;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) daysCount = Math.max(diff, 1);
  }

  if (id) {
    const trip = trips.find(t => t.id === id);
    if (trip) {
      trip.type = type;
      trip.name = name;
      trip.destination = destination;
      trip.startDate = startDate;
      trip.endDate = endDate;
      trip.budget = budget;
      trip.description = description;
      trip.tags = tags;
      trip.photo = currentPhotoData;
      trip.daysCount = Math.max(trip.daysCount || 1, daysCount);
      showToast('여행 코스가 수정되었습니다.', 'success');
    }
  } else {
    const newTrip = {
      id: 'trip-' + Date.now(),
      type,
      name,
      destination,
      startDate,
      endDate,
      budget,
      description,
      tags,
      photo: currentPhotoData,
      daysCount,
      createdAt: Date.now(),
      spots: []
    };
    trips.unshift(newTrip);
    showToast('새 여행 코스가 생성되었습니다!', 'success');
  }

  saveData();
  closeModal('modal-trip');
  updateUI();
  renderMap();
}

function openSpotModal(spotData = {}) {
  const form = document.getElementById('form-spot');
  form.reset();

  const activeTrip = trips.find(t => t.id === (spotData.tripId || currentTripId));
  if (!activeTrip) {
    alert('장소를 추가할 여행이 선택되지 않았습니다.');
    return;
  }

  const isEdit = !!spotData.id;
  document.getElementById('modal-spot-title').textContent = isEdit ? '장소(스팟) 정보 수정' : '일정에 장소(스팟) 추가';
  document.getElementById('spot-id').value = spotData.id || '';

  // Day 셀렉트 채우기
  const daySelect = document.getElementById('spot-day');
  daySelect.innerHTML = '';
  for (let d = 1; d <= (activeTrip.daysCount || 3); d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `Day ${d}`;
    if (d === (spotData.day || currentDay || 1)) opt.selected = true;
    daySelect.appendChild(opt);
  }

  // 카테고리
  const category = spotData.category || 'sightseeing';
  document.getElementById('spot-category').value = category;
  handleCategoryChange(category);
  document.getElementById('spot-custom-category').value = spotData.customCategoryName || '';

  // 기본 정보
  document.getElementById('spot-name').value = spotData.name || '';
  document.getElementById('spot-time').value = spotData.time || '';
  document.getElementById('spot-cost').value = spotData.cost || '';
  document.getElementById('spot-notes').value = spotData.notes || '';

  // 좌표
  const lat = spotData.lat != null ? spotData.lat : (selectedCoords ? selectedCoords.lat : 37.5665);
  const lng = spotData.lng != null ? spotData.lng : (selectedCoords ? selectedCoords.lng : 126.9780);
  document.getElementById('spot-lat').value = lat;
  document.getElementById('spot-lng').value = lng;
  document.getElementById('display-spot-coords').textContent = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

  // 사진
  currentPhotoData = spotData.photo || '';
  updatePhotoPreviewGeneric('spot-photo-preview-box', 'img-spot-photo-preview', currentPhotoData);
  document.getElementById('input-spot-photo-url').value = (currentPhotoData.startsWith('http')) ? currentPhotoData : '';

  document.getElementById('modal-spot').style.display = 'flex';
}

function handleSpotFormSubmit(e) {
  e.preventDefault();

  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  const spotId = document.getElementById('spot-id').value;
  const day = parseInt(document.getElementById('spot-day').value) || 1;
  const category = document.getElementById('spot-category').value;
  const customCategoryName = document.getElementById('spot-custom-category').value.trim();
  const name = document.getElementById('spot-name').value.trim();
  const time = document.getElementById('spot-time').value;
  const cost = document.getElementById('spot-cost').value.trim();
  const notes = document.getElementById('spot-notes').value.trim();
  const lat = parseFloat(document.getElementById('spot-lat').value);
  const lng = parseFloat(document.getElementById('spot-lng').value);

  if (!name) {
    alert('장소명을 입력해주세요.');
    return;
  }

  if (isNaN(lat) || isNaN(lng)) {
    alert('지도 위치를 설정해주세요.');
    return;
  }

  if (!trip.spots) trip.spots = [];

  if (spotId) {
    // 수정
    const spot = trip.spots.find(s => s.id === spotId);
    if (spot) {
      spot.day = day;
      spot.category = category;
      spot.customCategoryName = customCategoryName;
      spot.name = name;
      spot.time = time;
      spot.cost = cost;
      spot.notes = notes;
      spot.lat = lat;
      spot.lng = lng;
      spot.photo = currentPhotoData;
      showToast('장소 정보가 수정되었습니다.', 'success');
    }
  } else {
    // 신규 추가
    const sameDaySpots = trip.spots.filter(s => s.day === day);
    const newOrder = sameDaySpots.length + 1;

    const newSpot = {
      id: 'spot-' + Date.now(),
      day,
      order: newOrder,
      category,
      customCategoryName,
      name,
      time,
      cost,
      notes,
      lat,
      lng,
      photo: currentPhotoData
    };

    trip.spots.push(newSpot);
    showToast(`Day ${day}에 새로운 장소가 추가되었습니다!`, 'success');
  }

  saveData();
  closeModal('modal-spot');
  renderSpotsTimeline();
  renderMap();
}

function deleteSpot(tripId, spotId) {
  const trip = trips.find(t => t.id === tripId);
  if (!trip || !trip.spots) return;

  if (confirm('이 장소를 일정에서 삭제하시겠습니까?')) {
    trip.spots = trip.spots.filter(s => s.id !== spotId);
    saveData();
    renderSpotsTimeline();
    renderMap();
    showToast('장소가 삭제되었습니다.', 'info');
  }
}

function confirmDeleteTrip() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;

  if (confirm(`'${trip.name}' 여행 코스와 모든 일정 장소를 삭제하시겠습니까?`)) {
    trips = trips.filter(t => t.id !== currentTripId);
    saveData();
    exitTripView();
    showToast('여행 코스가 삭제되었습니다.', 'info');
  }
}

// ==========================================
// 8. 뷰 모드 및 사이드바 리스트 렌더링
// ==========================================
function setMainMode(mode) {
  mainMode = mode;

  document.getElementById('tab-mode-trips').classList.toggle('active', mode === 'trips');
  document.getElementById('tab-mode-places').classList.toggle('active', mode === 'places');

  document.getElementById('trips-list-container').style.display = mode === 'trips' ? 'block' : 'none';
  document.getElementById('places-list-container').style.display = mode === 'places' ? 'block' : 'none';

  renderMap();
}

function getFilteredTrips() {
  let list = trips.filter(t => {
    if (currentFilter === 'visited' && t.type !== 'visited') return false;
    if (currentFilter === 'wishlist' && t.type !== 'wishlist') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (t.name || '').toLowerCase().includes(q);
      const matchDest = (t.destination || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
      if (!matchName && !matchDest && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    if (currentSort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    if (currentSort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
    if (currentSort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (currentSort === 'date-desc') return (b.startDate || '').localeCompare(a.startDate || '');
    return 0;
  });

  return list;
}

function renderTripsList() {
  const container = document.getElementById('trip-list');
  const filtered = getFilteredTrips();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-suitcase-rolling"></i>
        <p>${searchQuery ? '검색된 여행 코스가 없습니다.' : '등록된 여행 코스가 없습니다.'}</p>
        <small>상단의 '+ 새 여행 만들기' 버튼을 눌러 여행 일정을 계획해보세요!</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isVisited = t.type === 'visited';
    const spotsCount = (t.spots || []).length;
    const dateText = (t.startDate || t.endDate) ? `${t.startDate || ''} ~ ${t.endDate || ''}` : '일정 미지정';

    let coverHtml = '';
    if (t.photo) {
      coverHtml = `<img src="${escapeHtml(t.photo)}" class="trip-card-cover" alt="${escapeHtml(t.name)}" onerror="this.style.display='none'">`;
    }

    return `
      <div class="trip-card" onclick="app.enterTripView('${t.id}')">
        ${coverHtml}
        <div class="trip-card-body">
          <div class="trip-card-top">
            <span class="place-badge ${isVisited ? 'visited' : 'wishlist'}">
              ${isVisited ? '다녀온 여행' : '갈 예정'}
            </span>
            <span class="trip-card-spots-count">
              <i class="fa-solid fa-location-dot"></i> ${spotsCount}개 장소
            </span>
          </div>

          <h3 class="trip-card-title">${escapeHtml(t.name)}</h3>
          <div class="trip-card-loc"><i class="fa-solid fa-earth-americas"></i> ${escapeHtml(t.destination)}</div>

          <div class="trip-card-meta">
            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(dateText)}</span>
            ${t.budget ? `<span><i class="fa-solid fa-wallet"></i> ${escapeHtml(t.budget)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getFilteredPlaces() {
  let list = places.filter(p => {
    if (currentFilter === 'visited' && p.type !== 'visited') return false;
    if (currentFilter === 'wishlist' && p.type !== 'wishlist') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCountry = (p.country || '').toLowerCase().includes(q);
      const matchNotes = (p.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchCountry && !matchNotes) return false;
    }
    return true;
  });

  return list;
}

function renderPlacesList() {
  const container = document.getElementById('place-list');
  const filtered = getFilteredPlaces();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-map-pin"></i>
        <p>등록된 관심 장소가 없습니다.</p>
        <small>지도를 클릭하거나 상단 버튼으로 가고 싶은 장소를 핀으로 꽂아보세요!</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isVisited = p.type === 'visited';
    return `
      <div class="place-card ${isVisited ? 'visited' : 'wishlist'}" onclick="app.focusPlace('${p.id}')">
        <div class="place-card-top">
          <h4 class="place-card-title">${escapeHtml(p.name)}</h4>
          <span class="place-badge ${isVisited ? 'visited' : 'wishlist'}">${isVisited ? '다녀온 곳' : '갈 곳'}</span>
        </div>
        <div class="place-card-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.country || '')}</div>
      </div>
    `;
  }).join('');
}

function updateUI() {
  renderTripsList();
  renderPlacesList();

  // 상단 통계 뱃지 갱신
  const totalTrips = trips.length;
  const visitedTrips = trips.filter(t => t.type === 'visited').length;
  const wishlistTrips = trips.filter(t => t.type === 'wishlist').length;

  document.getElementById('stat-all-count').textContent = totalTrips + places.length;
  document.getElementById('stat-visited-count').textContent = visitedTrips + places.filter(p => p.type === 'visited').length;
  document.getElementById('stat-wishlist-count').textContent = wishlistTrips + places.filter(p => p.type === 'wishlist').length;

  document.getElementById('count-trips').textContent = totalTrips;
  document.getElementById('count-places').textContent = places.length;
}

// ==========================================
// 9. 지오코딩 및 사진 압축 유틸리티
// ==========================================
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
      headers: { 'Accept-Language': 'ko,en' }
    });
    if (!res.ok) return { name: '', country: '' };
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
    const country = addr.country || '';
    let combined = [];
    if (country) combined.push(country);
    if (city && city !== country) combined.push(city);

    return {
      name: city || data.display_name.split(',')[0],
      country: combined.join(', ')
    };
  } catch (err) {
    return { name: '', country: '' };
  }
}

async function forwardGeocode(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, {
      headers: { 'Accept-Language': 'ko,en' }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

async function executeSpotGeocodeSearch() {
  const query = document.getElementById('input-spot-geocode-search').value.trim();
  const resultsContainer = document.getElementById('spot-geocode-results');
  if (!query) return;

  resultsContainer.innerHTML = '<div class="geocode-item" style="color:#64748b;">위치를 찾는 중...</div>';
  resultsContainer.style.display = 'block';

  const results = await forwardGeocode(query);
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="geocode-item" style="color:#ef4444;">검색 결과가 없습니다.</div>';
    return;
  }

  resultsContainer.innerHTML = results.map(item => `
    <div class="geocode-item" onclick="app.selectSpotGeocode(${item.lat}, ${item.lon}, '${escapeHtml(item.display_name)}')">
      <i class="fa-solid fa-location-dot" style="color:#3b82f6;"></i>
      <span>${escapeHtml(item.display_name)}</span>
    </div>
  `).join('');
}

function selectSpotGeocode(lat, lon, displayName) {
  document.getElementById('spot-lat').value = lat;
  document.getElementById('spot-lng').value = lon;
  document.getElementById('display-spot-coords').textContent = `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;

  const parts = displayName.split(',').map(s => s.trim());
  if (!document.getElementById('spot-name').value) {
    document.getElementById('spot-name').value = parts[0];
  }

  document.getElementById('spot-geocode-results').style.display = 'none';
  map.flyTo([lat, lon], 14);
}

// 이미지 리사이징 압축
function compressImage(file, maxWidth = 1000, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function updatePhotoPreviewGeneric(boxId, imgId, dataUrl) {
  const box = document.getElementById(boxId);
  const img = document.getElementById(imgId);
  if (dataUrl) {
    img.src = dataUrl;
    box.style.display = 'block';
  } else {
    img.src = '';
    box.style.display = 'none';
  }
}

// ==========================================
// 10. 단일 장소(Place) 핀 등록 로직 (호환성 유지)
// ==========================================
function openPlaceModal(initialData = {}) {
  const form = document.getElementById('form-place');
  form.reset();

  const isEdit = !!initialData.id;
  document.getElementById('modal-title').textContent = isEdit ? '관심 장소 수정' : '단일 관심 장소 핀 등록';
  document.getElementById('place-id').value = initialData.id || '';

  const lat = initialData.lat != null ? initialData.lat : (selectedCoords ? selectedCoords.lat : 37.5665);
  const lng = initialData.lng != null ? initialData.lng : (selectedCoords ? selectedCoords.lng : 126.9780);
  document.getElementById('place-lat').value = lat;
  document.getElementById('place-lng').value = lng;
  document.getElementById('display-coords').textContent = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

  document.getElementById('place-name').value = initialData.name || '';
  document.getElementById('place-country').value = initialData.country || '';

  const placeType = initialData.type || 'visited';
  form.elements['placeType'].value = placeType;

  currentPhotoData = initialData.photo || '';
  updatePhotoPreviewGeneric('photo-preview-box', 'img-photo-preview', currentPhotoData);

  document.getElementById('modal-place').style.display = 'flex';
}

function handlePlaceFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('place-id').value;
  const type = document.querySelector('input[name="placeType"]:checked').value;
  const name = document.getElementById('place-name').value.trim();
  const country = document.getElementById('place-country').value.trim();
  const lat = parseFloat(document.getElementById('place-lat').value);
  const lng = parseFloat(document.getElementById('place-lng').value);

  if (!name || isNaN(lat) || isNaN(lng)) {
    alert('장소 이름과 좌표를 확인해주세요.');
    return;
  }

  if (id) {
    const place = places.find(p => p.id === id);
    if (place) {
      place.type = type;
      place.name = name;
      place.country = country;
      place.lat = lat;
      place.lng = lng;
      place.photo = currentPhotoData;
      showToast('장소가 수정되었습니다.', 'success');
    }
  } else {
    places.unshift({
      id: 'place-' + Date.now(),
      type,
      name,
      country,
      lat,
      lng,
      photo: currentPhotoData,
      createdAt: Date.now()
    });
    showToast('새 관심 장소가 등록되었습니다!', 'success');
  }

  saveData();
  closeModal('modal-place');
  updateUI();
  renderMap();
}

// ==========================================
// 11. 데이터 저장 및 백업/복원
// ==========================================
function loadData() {
  try {
    const rawPlaces = localStorage.getItem(STORAGE_PLACES_KEY);
    places = rawPlaces ? JSON.parse(rawPlaces) : [];

    const rawTrips = localStorage.getItem(STORAGE_TRIPS_KEY);
    trips = rawTrips ? JSON.parse(rawTrips) : [];
  } catch (err) {
    console.error('Data load error:', err);
    places = [];
    trips = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_PLACES_KEY, JSON.stringify(places));
    localStorage.setItem(STORAGE_TRIPS_KEY, JSON.stringify(trips));
  } catch (err) {
    console.error('Data save error:', err);
    showToast('저장 공간 용량을 초과했거나 오류가 발생했습니다.', 'warning');
  }
}

function loadSampleData(silent = false) {
  if (!silent && (trips.length > 0 || places.length > 0)) {
    if (!confirm('예시 여행 코스와 장소를 추가하시겠습니까? (기존 데이터 유지)')) return;
  }

  const tripIds = new Set(trips.map(t => t.name));
  SAMPLE_TRIPS.forEach(st => {
    if (!tripIds.has(st.name)) {
      trips.push({
        ...st,
        id: 'trip-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
      });
    }
  });

  const placeIds = new Set(places.map(p => p.name));
  SAMPLE_PLACES.forEach(sp => {
    if (!placeIds.has(sp.name)) {
      places.push({
        ...sp,
        id: 'place-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
      });
    }
  });

  saveData();
  updateUI();
  renderMap();
  if (!silent) showToast('멋진 예시 여행 코스와 장소들을 추가했습니다!', 'success');
}

function exportData() {
  const exportPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    trips: trips,
    places: places
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `my-travel-log-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('여행 코스 및 데이터 백업 파일이 저장되었습니다.', 'success');
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      // v2 포맷 지원
      if (imported.trips || imported.places) {
        if (confirm('백업 파일에서 여행 데이터를 불러와 병합하시겠습니까?')) {
          if (Array.isArray(imported.trips)) {
            imported.trips.forEach(it => {
              if (!trips.some(t => t.id === it.id)) trips.push(it);
            });
          }
          if (Array.isArray(imported.places)) {
            imported.places.forEach(ip => {
              if (!places.some(p => p.id === ip.id)) places.push(ip);
            });
          }
        }
      } 
      // 이전 v1 배열 포맷 호환
      else if (Array.isArray(imported)) {
        if (confirm(`${imported.length}개의 관심 장소를 불러오시겠습니까?`)) {
          imported.forEach(ip => {
            if (!places.some(p => p.id === ip.id)) places.push(ip);
          });
        }
      }

      saveData();
      updateUI();
      renderMap();
      showToast('백업 데이터를 성공적으로 불러왔습니다!', 'success');
    } catch (err) {
      alert('백업 파일 형식이 올바르지 않습니다: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==========================================
// 12. UI 이벤트 바인딩
// ==========================================
function setupEvents() {
  // 모달 오픈 버튼들
  document.getElementById('btn-open-add-trip').addEventListener('click', () => openTripModal());
  document.getElementById('btn-open-add-modal').addEventListener('click', () => {
    const center = map.getCenter();
    openPlaceModal({ lat: center.lat, lng: center.lng });
  });

  // 폼 제출
  document.getElementById('form-trip').addEventListener('submit', handleTripFormSubmit);
  document.getElementById('form-spot').addEventListener('submit', handleSpotFormSubmit);
  document.getElementById('form-place').addEventListener('submit', handlePlaceFormSubmit);

  // 모달 닫기
  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal('modal-place'));
  document.getElementById('btn-cancel-modal').addEventListener('click', () => closeModal('modal-place'));

  // 사진 압축 업로드 핸들러들
  document.getElementById('input-trip-photo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('사진 압축 중...', 'info');
    currentPhotoData = await compressImage(file, 1000, 0.78);
    updatePhotoPreviewGeneric('trip-photo-preview-box', 'img-trip-photo-preview', currentPhotoData);
    document.getElementById('input-trip-photo-url').value = '';
  });

  document.getElementById('input-spot-photo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('사진 압축 중...', 'info');
    currentPhotoData = await compressImage(file, 1000, 0.78);
    updatePhotoPreviewGeneric('spot-photo-preview-box', 'img-spot-photo-preview', currentPhotoData);
    document.getElementById('input-spot-photo-url').value = '';
  });

  document.getElementById('input-place-photo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('사진 압축 중...', 'info');
    currentPhotoData = await compressImage(file, 1000, 0.78);
    updatePhotoPreviewGeneric('photo-preview-box', 'img-photo-preview', currentPhotoData);
    document.getElementById('input-place-photo-url').value = '';
  });

  // 사진 삭제
  document.getElementById('btn-remove-trip-photo').addEventListener('click', () => {
    currentPhotoData = '';
    updatePhotoPreviewGeneric('trip-photo-preview-box', 'img-trip-photo-preview', '');
  });
  document.getElementById('btn-remove-spot-photo').addEventListener('click', () => {
    currentPhotoData = '';
    updatePhotoPreviewGeneric('spot-photo-preview-box', 'img-spot-photo-preview', '');
  });
  document.getElementById('btn-remove-photo').addEventListener('click', () => {
    currentPhotoData = '';
    updatePhotoPreviewGeneric('photo-preview-box', 'img-photo-preview', '');
  });

  // 검색
  const searchInput = document.getElementById('input-search');
  const clearBtn = document.getElementById('btn-clear-search');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearBtn.style.display = searchQuery ? 'block' : 'none';
    updateUI();
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    updateUI();
  });

  // 상단 필터 뱃지
  document.querySelectorAll('.stat-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      setFilter(badge.dataset.filter);
    });
  });

  // 탭 필터
  document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
    });
  });

  // 정렬
  document.getElementById('select-sort').addEventListener('change', (e) => {
    currentSort = e.target.value;
    updateUI();
  });

  // 사이드바 토글
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    setTimeout(() => map.invalidateSize(), 300);
  });

  // 지도 테마
  document.getElementById('btn-theme-google-roads').addEventListener('click', () => setTileLayer('googleRoads'));
  document.getElementById('btn-theme-google-hybrid').addEventListener('click', () => setTileLayer('googleHybrid'));
  document.getElementById('btn-theme-google-terrain').addEventListener('click', () => setTileLayer('googleTerrain'));
  document.getElementById('btn-theme-street').addEventListener('click', () => setTileLayer('street'));

  // 지도 뷰 리셋 & 내 위치
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    map.flyTo([37.5665, 126.9780], 6, { duration: 1 });
  });

  document.getElementById('btn-my-location').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    showToast('내 위치 확인 중...', 'info');
    navigator.geolocation.getCurrentPosition(pos => {
      map.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
    });
  });

  // 안내 배너 닫기
  document.getElementById('btn-close-guide').addEventListener('click', () => {
    document.getElementById('map-guide-banner').style.display = 'none';
  });

  // 샘플 & 백업
  document.getElementById('btn-sample-data').addEventListener('click', () => loadSampleData());
  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('input-import-data').addEventListener('change', importData);
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.stat-badge').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  updateUI();
  renderMap();
}

function handleCategoryChange(val) {
  const customGroup = document.getElementById('spot-custom-category-group');
  customGroup.style.display = val === 'custom' ? 'block' : 'none';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 13. 모바일 전용 뷰 및 인터랙션 제어
// ==========================================
let mobileActiveTab = 'map'; // 'map' | 'list'

function setMobileActiveTab(tab) {
  mobileActiveTab = tab;
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('btn-mobile-view-toggle');

  document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => item.classList.remove('active'));

  if (tab === 'list') {
    sidebar.classList.add('mobile-active');
    const navList = document.getElementById('nav-item-list');
    if (navList) navList.classList.add('active');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-map"></i> <span>지도 보기</span>';
    }
  } else {
    sidebar.classList.remove('mobile-active');
    const navMap = document.getElementById('nav-item-map');
    if (navMap) navMap.classList.add('active');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i> <span>목록 보기</span>';
    }
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
}

function toggleMobileView() {
  if (mobileActiveTab === 'map') {
    setMobileActiveTab('list');
  } else {
    setMobileActiveTab('map');
  }
}

function setMobilePlacesTab() {
  setMainMode('places');
  setMobileActiveTab('list');
  document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
  const navPlaces = document.getElementById('nav-item-places');
  if (navPlaces) navPlaces.classList.add('active');
}

function openMobileAddMenu() {
  document.getElementById('modal-mobile-add-menu').style.display = 'flex';
}

function openMobileMoreModal() {
  document.getElementById('modal-mobile-more').style.display = 'flex';
}

// 글로벌 네임스페이스
window.app = {
  setMainMode,
  enterTripView,
  exitTripView,
  setTripDay,
  addNewDayToTrip,
  openAddTripModal: () => openTripModal(),
  openAddPlaceModal: () => {
    const center = map.getCenter();
    openPlaceModal({ lat: center.lat, lng: center.lng });
  },
  openAddSpotModal: () => openSpotModal({ tripId: currentTripId, day: currentDay > 0 ? currentDay : 1 }),
  openEditSpotModal: (tripId, spotId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const spot = (trip.spots || []).find(s => s.id === spotId);
    if (spot) openSpotModal({ ...spot, tripId });
  },
  openEditTripModal: () => {
    const trip = trips.find(t => t.id === currentTripId);
    if (trip) openTripModal(trip);
  },
  confirmDeleteTrip,
  deleteSpot,
  moveSpotOrder,
  focusSpot,
  focusPlace: (placeId) => {
    if (window.innerWidth <= 768) {
      setMobileActiveTab('map');
    }
    const marker = markersMap[placeId];
    if (marker) {
      map.flyTo(marker.getLatLng(), 14);
      setTimeout(() => marker.openPopup(), 400);
    }
  },
  closeModal,
  handleCategoryChange,
  executeSpotGeocodeSearch,
  selectSpotGeocode,
  resetToHome: exitTripView,
  // 모바일 전용
  setMobileActiveTab,
  toggleMobileView,
  setMobilePlacesTab,
  openMobileAddMenu,
  openMobileMoreModal
};
