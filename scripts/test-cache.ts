async function testCache() {
  console.log('Making first request...')
  const res1 = await fetch('http://localhost:3000/api/v2/pvp-items')
  const data1 = await res1.json()
  console.log('First response timestamp:', data1.timestamp)

  console.log('\nWaiting 5 seconds...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  console.log('Making second request...')
  const res2 = await fetch('http://localhost:3000/api/v2/pvp-items')
  const data2 = await res2.json()
  console.log('Second response timestamp:', data2.timestamp)

  // If timestamps are the same, cache is working
  console.log('\nCache working:', data1.timestamp === data2.timestamp)
}

testCache() 