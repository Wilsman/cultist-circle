param([string]$Url = "http://localhost:3000/recipes")

$ErrorActionPreference = "Stop"
$session = "recipes-mobile"
foreach ($width in @(320, 375, 390, 768, 1280)) {
  agent-browser --session $session set viewport $width 900 | Out-Null
  agent-browser --session $session open $Url | Out-Null
  $script = @'
(async () => {
  const cards = [...document.querySelectorAll('[id^="recipe-"]')];
  if (!cards.length) throw new Error('No recipe cards rendered');
  for (const card of cards) {
    card.scrollIntoView({block: 'center'});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bounds = card.getBoundingClientRect();
    const parent = card.parentElement.getBoundingClientRect();
    if (bounds.left < parent.left - 1 || bounds.right > parent.right + 1) {
      throw new Error(`${card.id}: card width ${bounds.width} exceeds container ${parent.width} at ${innerWidth}px`);
    }
    for (const element of card.querySelectorAll('button, a, code')) {
      const rect = element.getBoundingClientRect();
      if (element.tagName === 'CODE' && element.scrollWidth > element.clientWidth + 1) {
        throw new Error(`${card.id}: promo code text is clipped at ${innerWidth}px`);
      }
      if (rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) {
        throw new Error(`${card.id}: ${element.textContent} overflows at ${innerWidth}px`);
      }
    }
  }
  return `${cards.length} cards fit at ${innerWidth}px`;
})()
'@
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
  agent-browser --session $session eval -b $encoded
  if ($LASTEXITCODE -ne 0) { throw "Recipe mobile layout failed at ${width}px" }
}
