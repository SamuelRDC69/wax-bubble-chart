const millionsFormat = d3.format("$,");

function supplyFormat(x) {
  var s = d3.format(".3s")(x);
  switch (s[s.length - 1]) {
    case "G": return s.slice(0, -1) + "B";
  }
  return s;
}

const dict = {
  market_cap: "market_capClean",
  volume_24h: "volume_24hClean",
  price: "priceClean",
};

const width = window.innerWidth, height = 500;

const svg = d3.select("#graph").append("svg").attr("width", width).attr("height", height).attr("overflow", "hidden");

const pack = d3.pack().size([width, height]).padding(1.5);

async function fetchData() {
  console.log('Fetching data...');
  try {
    const tokenResponse = await fetch('https://wax.alcor.exchange/api/v2/tokens');
    if (!tokenResponse.ok) throw new Error(`Token API error: ${tokenResponse.statusText}`);
    console.log('Tokens fetched');
    const tokens = await tokenResponse.json();

    const poolResponse = await fetch('https://wax.alcor.exchange/api/v2/swap/pools');
    if (!poolResponse.ok) throw new Error(`Pool API error: ${poolResponse.statusText}`);
    console.log('Pools fetched');
    const pools = await poolResponse.json();

    const tokenData = tokens.map(token => {
      const relevantPools = pools.filter(pool => pool.tokenA.symbol === token.symbol || pool.tokenB.symbol === token.symbol);
      
      const avgChange24 = relevantPools.reduce((acc, pool) => acc + pool.change24, 0) / relevantPools.length;
      const avgChangeWeek = relevantPools.reduce((acc, pool) => acc + pool.changeWeek, 0) / relevantPools.length;

      return {
        symbol: token.symbol,
        market_cap: token.usd_price * 1e6, // Example conversion, adapt as necessary
        market_capClean: millionsFormat(token.usd_price * 1e6),
        volume_24h: relevantPools.reduce((acc, pool) => acc + pool.volumeUSD24, 0),
        volume_24hClean: millionsFormat(relevantPools.reduce((acc, pool) => acc + pool.volumeUSD24, 0)),
        price: token.usd_price,
        priceClean: millionsFormat(token.usd_price),
        change24: avgChange24,
        changeWeek: avgChangeWeek
      };
    });

    console.log('Data processed', tokenData);
    return tokenData;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

function createChart(data) {
  console.log('Creating chart...');
  const root = d3.hierarchy({ children: data })
    .sum(d => d.market_cap)
    .sort((a, b) => b.market_cap - a.market_cap);

  const tooltip = d3.select('#graph').append("div").style("opacity", 0).attr("class", "tooltip").style("background-color", "black").style("border-radius", "5px").style("padding", "10px").style("color", "white").style("position", "absolute");

  const showTooltip = d => {
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html("Currency: " + d.data.symbol + "<br> Market Capitalization: " + d.data.market_capClean + "<br> 24H Change: " + d.data.change24 + "%<br> 7D Change: " + d.data.changeWeek + "%").style("left", (d.x + (d3.mouse(this)[0] + 30)) + "px").style("top", (d.y + (d3.mouse(this)[1] + 30)) + "px");
  };

  const moveTooltip = d => {
    tooltip.style("left", (d.x + (d3.mouse(this)[0] + 30)) + "px").style("top", (d.y + (d3.mouse(this)[1] + 30)) + "px");
  };

  const hideTooltip = d => {
    tooltip.transition().duration(200).style("opacity", 0);
  };

  const node = svg.selectAll(".node").data(pack(root).leaves()).enter().append("g").attr("class", "node").attr("transform", d => "translate(" + d.x + "," + d.y + ")").on("mouseover", showTooltip).on("mousemove", moveTooltip).on("mouseleave", hideTooltip);

  node.append("circle").attr("id", d => d.id).attr("r", d => d.r).attr("fill", "black");

  node.append("text").attr("class", "labels").attr("dy", ".2em").text(d => d.data.symbol).attr("font-family", "BloombergBold").attr("font-size", d => d.r / 5).attr("fill", "white").style("text-anchor", "middle");

  node.append("text").attr("class", "ranks").attr("dy", "1.8em").text(d => "24H: " + d.data.change24 + "%").attr("font-family", "BloombergBold").attr("font-size", d => d.r / 7).attr("fill", "white").style("text-anchor", "middle");
  
  console.log('Chart created');
}

async function updateData(variable) {
  try {
    console.log('Updating data...');
    const data = await fetchData();
    const root = d3.hierarchy({ children: data }).sum(d => d[variable]).sort((a, b) => b[variable] - a[variable]);

    const node = svg.selectAll(".node").data(pack(root).leaves()).transition().duration(2000).attr("transform", d => "translate(" + d.x + "," + d.y + ")").select("circle").attr("id", d => d.id).attr("r", d => d.r).attr("fill", "black");

    svg.selectAll(".node").select(".labels").transition().duration(2000).attr("dy", ".2em").style("text-anchor", "middle").text(d => d.data.symbol).attr("font-family", "BloombergBold").attr("font-size", d => d.r / 5).attr("fill", "white");

    svg.selectAll(".node").select(".ranks").transition().delay(500).duration(1000).attr("dy", "1.8em").text(d => d.data[dict[variable]]).attr("font-family", "BloombergBold").attr("font-size", d => d.r / 7).attr("fill", "white").style("text-anchor", "middle");
    
    console.log('Data updated');
  } catch (error) {
    console.error('Error updating data:', error);
  }
}

fetchData().then(createChart).catch(error => console.error('Error creating chart:', error));
