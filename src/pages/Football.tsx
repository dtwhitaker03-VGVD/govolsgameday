import { SportPage } from '../components/layout/SportPage';

export default function Football() {
  return (
    <SportPage
      config={{
        roomCategory:        'football',
        boardTitle:          'FOOTBALL DISCUSSION BOARD',
        sportCategory:       'football',
        forumCategory:       'football',
        recruitingCategory:  'football_recruiting',
        qotdCategories:      ['football'],
      }}
    />
  );
}
