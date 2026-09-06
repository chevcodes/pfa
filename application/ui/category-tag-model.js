export function categoryTagModel(name, catColour, isReview) {
  const review = isReview(name);
  return {
    label: review ? 'To review' : name,
    color: catColour(name),
    review,
  };
}
