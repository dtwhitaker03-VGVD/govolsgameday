import { SportPage } from '../components/layout/SportPage';

export default function Basketball() {
  return (
    <SportPage
      config={{
        roomCategory:        'basketball',
        boardTitle:          'BASKETBALL DISCUSSION BOARD',
        sportCategory:       'basketball',
        videoTitle:          'BASKETBALL VIDEO HUB — YOUTUBE',
        forumCategory:       'basketball',
        recruitingCategory:  'basketball_recruiting',
        qotdCategories:      ['basketball'],
      }}
    />
  );
}
