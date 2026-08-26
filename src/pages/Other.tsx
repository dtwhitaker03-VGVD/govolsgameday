import { SportPage } from '../components/layout/SportPage';

export default function Other() {
  return (
    <SportPage
      config={{
        roomCategory:        'other',
        boardTitle:          'VOL SPORTS DISCUSSION BOARD',
        sportCategory:       'other',
        videoTitle:          'VOL SPORTS VIDEO HUB — YOUTUBE',
        forumCategory:       'other_sports',
        recruitingCategory:  'other_recruiting',
        qotdCategories:      ['football', 'basketball', 'baseball', 'lady-vols'],
      }}
    />
  );
}
