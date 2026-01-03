import { TOPIK_6_WORDS } from './topik6Data';

export const WORDS = [
  ...TOPIK_6_WORDS,
  {
    id: 1,
    hangul: '학생',
    meaning: '学生',
    pronunciation: 'hak-saeng',
    partOfSpeech: '名词',
    category: '学校生活',
    hanja: [
      { char: '학', origin: '學', meaning: '배울 학 (学)', related: ['학교 (学校)', '학원 (学院)', '학습 (学习)'] },
      { char: '생', origin: '生', meaning: '날 생 (生)', related: ['생활 (生活)', '생일 (生日)', '평생 (平生)'] }
    ],
    video: {
      videoId: '9bZkp7q19f0', // Gangnam Style (Reliable test video)
      start: 48,
      end: 55,
      contextMeaning: 'Everyday life (Similar context)'
    }
  },
  {
    id: 2,
    hangul: '도서관',
    meaning: '图书馆',
    pronunciation: 'do-seo-gwan',
    partOfSpeech: '名词',
    category: '公共场所',
    hanja: [
      { char: '도', origin: '圖', meaning: '그림 도 (图)', related: ['지도 (地图)', '도표 (图表)'] },
      { char: '서', origin: '書', meaning: '글 서 (书)', related: ['서점 (书店)', '서류 (書類/文件)'] },
      { char: '관', origin: '館', meaning: '집 관 (馆)', related: ['영화관 (映画館/电影院)', '대사관 (大使馆)'] }
    ],
    video: {
      videoId: 'MXY7KfNUvTg', // K-Drama scene example
      start: 12,
      end: 20,
      contextMeaning: 'Meeting at the library'
    }
  },
  {
    id: 3,
    hangul: '감사합니다',
    meaning: '谢谢',
    pronunciation: 'gam-sa-ham-ni-da',
    partOfSpeech: '常用语',
    category: '基础短语',
    hanja: [
      { char: '감', origin: '感', meaning: '느낄 감 (感)', related: ['감동 (感动)', '감정 (感情)'] },
      { char: '사', origin: '謝', meaning: '사례할 사 (谢)', related: ['사과 (谢过/道歉)', '사례 (谢礼)'] }
    ],
    video: {
      videoId: 'jY-0p8sgyUg', // Varierty show clip
      start: 105,
      end: 110,
      contextMeaning: 'Expressing gratitude'
    }
  }
];
