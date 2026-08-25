import { SportPage } from '../components/layout/SportPage';

export default function LvBasketball() {
  return (
    <SportPage
      config={{
        roomCategory:        'lv-basketball',
        boardTitle:          'LADY VOLS BASKETBALL DISCUSSION BOARD',
        sportCategory:       'lv-basketball',
        videoTitle:          'LADY VOLS BASKETBALL VIDEO HUB — YOUTUBE',
        forumCategory:       'lady_vol_basketball',
        recruitingCategory:  'basketball_recruiting',
        qotdCategories:      ['lady-vols'],
      }}
    />
  );
}
