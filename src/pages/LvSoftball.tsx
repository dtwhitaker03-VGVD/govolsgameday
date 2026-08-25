import { SportPage } from '../components/layout/SportPage';

export default function LvSoftball() {
  return (
    <SportPage
      config={{
        roomCategory:        'lv-softball',
        boardTitle:          'LADY VOLS SOFTBALL DISCUSSION BOARD',
        sportCategory:       'lv-softball',
        videoTitle:          'LADY VOLS SOFTBALL VIDEO HUB — YOUTUBE',
        forumCategory:       'lady_vol_softball',
        recruitingCategory:  'other_recruiting',
        qotdCategories:      ['lady-vols'],
      }}
    />
  );
}
