import { SportPage } from '../components/layout/SportPage';

export default function Baseball() {
  return (
    <SportPage
      config={{
        roomCategory:        'baseball',
        boardTitle:          'BASEBALL DISCUSSION BOARD',
        sportCategory:       'baseball',
        forumCategory:       'baseball',
        recruitingCategory:  'other_recruiting',
        qotdCategories:      ['baseball'],
      }}
    />
  );
}
