import { SportPage } from '../components/layout/SportPage';

export default function Basketball() {
  return (
    <SportPage
      config={{
        roomCategory:        'basketball',
        boardTitle:          'BASKETBALL DISCUSSION BOARD',
        sportCategory:       'basketball',
        forumCategory:       'basketball',
        recruitingCategory:  'basketball_recruiting',
        qotdCategories:      ['basketball'],
      }}
    />
  );
}
