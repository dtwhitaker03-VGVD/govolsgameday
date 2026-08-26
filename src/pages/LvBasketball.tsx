import { SportPage } from '../components/layout/SportPage';

export default function LvBasketball() {
  return (
    <SportPage
      config={{
        roomCategory:        'lv-basketball',
        boardTitle:          'LADY VOLS BASKETBALL DISCUSSION BOARD',
        sportCategory:       'lv-basketball',
        forumCategory:       'lady_vol_basketball',
        recruitingCategory:  'basketball_recruiting',
        qotdCategories:      ['lady-vols'],
      }}
    />
  );
}
