// ==================== 通用辅助函数 ====================
function multiAfford(costs) {
    for (let k in costs) {
        let [l, r] = k.split(".")
        if (!player[l] || player[l][r] === undefined) return false
        if (player[l][r].lt(costs[k])) return false
    }
    return true
}
function multiPay(costs) {
    for (let k in costs) {
        let [l, r] = k.split(".")
        player[l][r] = player[l][r].sub(costs[k])
    }
}
function canUse(key, ms) {
    if (!player.settings) player.settings = { coolDownsEnabled: true }
    if (!player.cooldowns) player.cooldowns = {}
    if (player.settings.coolDownsEnabled === false) return true
    return (Date.now() - (player.cooldowns[key] || 0)) >= ms
}
function markUsed(key) {
    if (!player.settings) player.settings = { coolDownsEnabled: true }
    if (!player.cooldowns) player.cooldowns = {}
    if (player.settings.coolDownsEnabled === false) return
    player.cooldowns[key] = Date.now()
}
function cardHTML({ title, desc, costText, bought, canBuy, onClick }) {
    let bg, border, cursor
    if (bought) { bg = "#5cbb5c"; border = "#2e7d2e"; cursor = "default" }
    else if (canBuy) { bg = "#7a7a7a"; border = "#b0b0b0"; cursor = "pointer" }
    else {
        bg = canBuy ? "#c0392b" : "#7a1a1a"
        border = canBuy ? "#e74c3c" : "#4a0f0f"
        cursor = canBuy ? "pointer" : "default"
    }
    let click = (canBuy && !bought && onClick) ? `onclick="${onClick}"` : ''
    return `
        <div ${click}
            style="border:3px solid ${border}; border-radius:12px; padding:16px;
                width:240px; min-height:150px; box-sizing:border-box;
                background:${bg}; text-align:center; cursor:${cursor};
                box-shadow:0 0 12px ${border}; transition:0.15s;
                display:flex; flex-direction:column; justify-content:space-between;">
            <h3 style="margin:0 0 10px 0; color:#fff; font-size:17px;">${title}</h3>
            <div style="color:#fff; font-size:13px; line-height:1.6; flex:1;">${desc}</div>
            <div style="color:#fff; font-size:13px; margin-top:12px; font-weight:bold;">
                价格: ${costText}
            </div>
        </div>
    `
}
function buyMultiUpg(layer, id) {
    let upg = layers[layer].upgrades[id]
    if (!upg || !upg.multiCost) return
    if (player[layer].upgrades.includes(id)) return
    if (!multiAfford(upg.multiCost)) return
    multiPay(upg.multiCost)
    player[layer].upgrades.push(id)
    if (upg.onPurchase) run(upg.onPurchase, upg)
    needCanvasUpdate = true
}
function upgradeGridHTML(layer, ids) {
    let html = '<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:16px; padding:20px;">'
    for (let id of ids) {
        let upg = layers[layer].upgrades[id]
        if (!upg || !upg.unlocked()) continue
        let bought = hasUpgrade(layer, id)
        let canBuy = !bought && multiAfford(upg.multiCost)
        html += cardHTML({
            title: upg.title, desc: upg.description,
            costText: upg.costText,
            bought, canBuy,
            onClick: `buyMultiUpg('${layer}', ${id})`,
        })
    }
    html += '</div>'
    return html
}

// ==================== 锻造产物解锁判断 ====================
function hasPlateUnlocked()    { return !!(player.forge && player.forge.unlocked) }
function hasRodUnlocked()      { return !!(player.forge && player.forge.rodUnlocked) }
function hasGearUnlocked()     { return !!(player.forge && player.forge.gearUnlocked) }
function hasWireUnlocked()     { return !!(player.forge && player.forge.wireUnlocked) }
function hasSingUnlocked()     { return (player.ad.boosters || 0) >= 2 }
function hasCoatingUnlocked()  { return !!(player.forge && player.forge.coatingUnlocked) }

// ==================== 升级层 ====================
addLayer("u", {
    name: "升级", symbol: "升级",
    row: 0, position: 0,
    color: "#5cbb5c", type: "none",
    startData() { return { unlocked: true, points: new Decimal(0) }},
    upgrades: {
        11: {
            title: "开始游戏",
            description: "解锁反物质维度页面和第一反物质维度，并获得 10 反物质",
            costText: "0 反物质",
            multiCost: { "ad.antimatter": new Decimal(0) },
            canAfford: false,
            unlocked() { return true },
            onPurchase() {
                player.ad.unlocked = true
                player.ad.antimatter = new Decimal(10)
                player.ad.dims[0] = 0
            },
        },
        12: {
            title: "算力中心",
            description: "解锁算力层级",
            costText: "200 反物质",
            multiCost: { "ad.antimatter": new Decimal(200) },
            unlocked() { return hasUpgrade("u", 11) },
            onPurchase() { player.power.unlocked = true },
        },
        13: {
            title: "研究站",
            description: "解锁研究层级",
            costText: "300 反物质 + 3 算力",
            multiCost: { "ad.antimatter": new Decimal(300), "power.MP": new Decimal(3) },
            unlocked() { return hasUpgrade("u", 12) },
            onPurchase() { player.research.unlocked = true },
        },
    },
    tabFormat: [ ["display-text", () => upgradeGridHTML("u", [11, 12, 13])] ],
    layerShown() { return true },
})

// ==================== 反物质维度辅助 ====================
function dimUnlocked(n) {
    if (n === 1) return player.ad.unlocked
    if (n === 2) return hasUpgrade("research", 12)
    if (n === 3) return hasUpgrade("research", 14)
    if (n === 4) return hasUpgrade("research", 16)
    if (n === 5) return hasUpgrade("research", 18)
    if (n === 6) return hasUpgrade("research", 19)
    return false
}
function dimCost(n) {
    switch (n) {
        case 1: return { "ad.antimatter": new Decimal(10) }
        case 2: return { "ad.antimatter": new Decimal(80), "forge.antimatterPlate": new Decimal(1) }
        case 3: return { "ad.antimatter": new Decimal(800), "forge.antimatterPlate": new Decimal(2), "forge.antimatterRod": new Decimal(1) }
        case 4: return { "ad.antimatter": new Decimal(8000), "forge.antimatterRod": new Decimal(2), "forge.antimatterGear": new Decimal(1) }
        case 5: return { "ad.antimatter": new Decimal(1e5), "forge.antimatterGear": new Decimal(2), "forge.antimatterWire": new Decimal(1) }
        case 6: return { "ad.antimatter": new Decimal(1e16), "forge.antimatterPlate": new Decimal(16), "forge.antimatterGear": new Decimal(8), "forge.antimatterWire": new Decimal(4) }
    }
    return {}
}
function dimCostText(n) {
    return [
        "10 反物质",
        "80 反物质 + 1 板",
        "800 反物质 + 2 板 + 1 杆",
        "8000 反物质 + 2 杆 + 1 齿轮",
        "1e5 反物质 + 2 齿轮 + 1 导线",
        "1e16 反物质 + 16 板 + 8 齿轮 + 4 导线",
    ][n-1] || ""
}
function dimMult(n) {
    let base = player.ad.dims[n-1] >= 10 ? new Decimal(2) : new Decimal(1)
    return base.times(Decimal.pow(2, player.ad.boosters || 0))
}
function dimProd(n) {
    return new Decimal(player.ad.dims[n-1]).times(dimMult(n))
}
function buyDim(n) {
    if (player.ad.dims[n-1] >= 10) return
    let cost = dimCost(n)
    if (!multiAfford(cost)) return
    multiPay(cost)
    player.ad.dims[n-1] += 1
}
function genDim(n, noCd) {
    if (!noCd && !canUse("dim" + n, 100)) return
    if (!noCd) markUsed("dim" + n)
    let amt = dimProd(n)
    if (n === 1) {
        player.ad.antimatter = player.ad.antimatter.add(amt)
    } else {
        player.ad.dims[n-2] += amt.toNumber()
    }
}
function dimCardHTML(n) {
    let count = player.ad.dims[n-1]
    let maxed = count >= 10
    let cost = dimCost(n)
    let canBuy = !maxed && multiAfford(cost)
    let cdEnabled = player.settings && player.settings.coolDownsEnabled !== false
    let genReady = !cdEnabled || canUse("dim" + n, 100)
    let btn = "border-radius:6px; padding:4px 8px; font-size:12px; border:1px solid #4BDC13;"
    
    // 格式化：只保留4位有效数字/小数，防止数字抖动
    let countStr = format(count, 4)
    let prodStr = format(dimProd(n), 4)

    return `
    <div style="border:2px solid #0d5c0d; border-radius:10px; padding:10px; width:180px; background:#1a1a1a; text-align:center; box-shadow:0 0 8px #0d5c0d;">
        <h4 style="margin:0 0 6px 0; color:#4BDC13; font-size:14px;">第${n}反物质维度</h4>
        <div style="color:#fff; font-size:13px;">数量: <span style="color:#4BDC13;">${countStr}</span></div>
        <div style="color:#fff; font-size:13px;">产量: <span style="color:#4BDC13;">${prodStr}</span></div>
        <div style="display:flex; justify-content:center; gap:6px; margin-top:8px;">
            <button onclick="buyDim(${n})" ${canBuy?'':'disabled'}
                style="background:${maxed?'#333':(canBuy?'#0d5c0d':'#333')}; color:${(canBuy||maxed)?'#fff':'#888'}; ${btn} cursor:${canBuy?'pointer':'not-allowed'}; min-height:44px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                购买<br>${maxed?'(已满)':`(${dimCostText(n)})`}
            </button>
            <button onclick="genDim(${n})" ${genReady?'':'disabled'}
                style="background:${genReady?'#0d5c0d':'#333'}; color:${genReady?'#fff':'#888'}; ${btn} cursor:${genReady?'pointer':'not-allowed'}; min-height:44px; min-width:64px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                ${genReady?'生成':'冷却'}
            </button>
        </div>
    </div>`
}

// 反物质维度页面头部：只在对应产物解锁后显示其数量
function amHeaderHTML() {
    let plate  = (player.forge && player.forge.antimatterPlate)   || new Decimal(0)
    let rod    = (player.forge && player.forge.antimatterRod)     || new Decimal(0)
    let gear   = (player.forge && player.forge.antimatterGear)    || new Decimal(0)
    let wire   = (player.forge && player.forge.antimatterWire)    || new Decimal(0)
    let sing   = (player.forge && player.forge.singularityMatter) || new Decimal(0)
    let coat   = (player.forge && player.forge.coatingPlate)      || new Decimal(0)
    let eu     = player.ad.EU || new Decimal(0)

    let lines = []
    if (hasPlateUnlocked())   lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(plate)}</span> 反物质板`)
    if (hasRodUnlocked())     lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(rod)}</span> 反物质杆`)
    if (hasGearUnlocked())    lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(gear)}</span> 反物质齿轮`)
    if (hasWireUnlocked())    lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(wire)}</span> 反物质导线`)
    if (hasSingUnlocked())    lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(sing)}</span> 奇异物质`)
    if (hasCoatingUnlocked()) lines.push(`你有 <span style="color:#4BDC13;">${formatWhole(coat)}</span> 奇异物质覆盖板`)
    if (hasUpgrade("research", 21)) lines.push(`你有 <span style="color:#4BDC13;">${format(eu)}</span> EU 电力`)

    return `
        <div style="text-align:center; padding:20px 0 4px 0;">
            <div style="font-size:20px; color:#fff;">
                你有 <span style="color:#4BDC13; font-size:26px;">${format(player.ad.antimatter)}</span> 反物质
            </div>
            ${lines.length ? `<div style="font-size:14px; color:#fff; margin-top:10px; line-height:1.9;">${lines.join('<br>')}</div>` : ''}
        </div>
    `
}

function dimsGridHTML() {
    let html = '<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:12px; padding:10px;">'
    for (let n = 1; n <= 6; n++) if (dimUnlocked(n)) html += dimCardHTML(n)
    html += '</div>'
    return html
}

// ==================== 维度提升（价格 / 里程碑） ====================
function boostCost() {
    let n = player.ad.boosters || 0
    return new Decimal(1e9).pow(Decimal.pow(2, n))
}
function doBoost() {
    let cost = boostCost()
    if (player.ad.antimatter.lt(cost)) return
    player.ad.antimatter = new Decimal(0)
    if (player.forge) {
        player.forge.antimatterPlate = new Decimal(0)
        player.forge.antimatterRod   = new Decimal(0)
        player.forge.antimatterGear  = new Decimal(0)
        player.forge.antimatterWire  = new Decimal(0)
    }
    player.ad.boosters = (player.ad.boosters || 0) + 1
    needCanvasUpdate = true
}

function boostMilestoneHTML() {
    let b = player.ad.boosters || 0
    let cards = []

    let ms1 = b >= 1
    cards.push(`
        <div style="border:3px solid ${ms1?'#2e7d2e':'#7a1a1a'}; border-radius:12px;
            padding:14px 28px; background:${ms1?'#5cbb5c':'#3a1a1a'};
            text-align:center; min-width:300px; box-shadow:0 0 12px ${ms1?'#2e7d2e':'#7a1a1a'};">
            <div style="color:#fff; font-size:16px; font-weight:bold;">1 里程碑</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">解锁第五反物质维度生成器配方</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">一些新的研究</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">解锁批量合成AM产物</div>
            <div style="color:#fff; font-size:12px; margin-top:4px; opacity:0.8;">（AM产物每次合成数量改为 10）</div>
            <div style="color:#fff; font-size:12px; margin-top:4px;">反物质维度生产获得2^x加成</div>
            <div style="color:#fff; font-size:12px; margin-top:4px; opacity:0.8;">（x为维度提升次数）</div>
        </div>
    `)

    let ms2 = b >= 2
    cards.push(`
        <div style="border:3px solid ${ms2?'#2e7d2e':'#7a1a1a'}; border-radius:12px;
            padding:14px 28px; background:${ms2?'#5cbb5c':'#3a1a1a'};
            text-align:center; min-width:300px; box-shadow:0 0 12px ${ms2?'#2e7d2e':'#7a1a1a'};">
            <div style="color:#fff; font-size:16px; font-weight:bold;">2 里程碑</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">解锁第六反物质维度生成器配方</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">解锁第五反物质维度自动购买</div>
            <div style="color:#fff; font-size:13px; margin-top:4px;">解锁奇异物质</div>
        </div>
    `)

    return cards.join('')
}

function boostPanelHTML() {
    let boosters = player.ad.boosters || 0
    let cost = boostCost()
    let can = player.ad.antimatter.gte(cost)

    let bg, border, cursor
    if (can) { bg = "#7a7a7a"; border = "#b0b0b0"; cursor = "pointer" }
    else     { bg = "#c0392b"; border = "#e74c3c"; cursor = "not-allowed" }

    let expDisplay
    try {
        let exp = new Decimal(9).times(Decimal.pow(2, boosters))
        expDisplay = exp.gt(1e15) ? format(exp) : exp.toString()
    } catch (e) {
        expDisplay = "?"
    }

    let btn = `<div ${can?'onclick="doBoost()"':''}
            style="border:3px solid ${border}; border-radius:12px;
                padding:16px 32px; background:${bg};
                text-align:center; min-width:300px;
                cursor:${cursor};
                box-shadow:0 0 12px ${border}; transition:0.15s;">
            <h3 style="margin:0 0 8px 0; color:#fff;">维度提升</h3>
            <div style="color:#fff; font-size:13px;">重置反物质及其产物，获得 1 维度提升</div>
            <div style="color:#fff; font-size:13px; margin-top:8px; font-weight:bold;">
                花费: 10^(${expDisplay}) 反物质
            </div>
            <div style="color:#fff; font-size:12px; margin-top:6px;">
                当前维度提升数: ${boosters}，所有维度效率 ×${format(Decimal.pow(2, boosters))}
            </div>
        </div>`

    return `<div style="display:flex; flex-direction:column; align-items:center; gap:14px; padding:20px;">
        ${boostMilestoneHTML()}${btn}
    </div>`
}

// ==================== 反物质维度层 ====================
addLayer("ad", {
    name: "反物质维度", symbol: "反物质维度",
    row: 0, position: 1,
    color: "#0d5c0d", type: "none",
    startData() { return {
        unlocked: false,
        points: new Decimal(0),
        antimatter: new Decimal(0),
        dims: [0,0,0,0,0,0,0,0],
        boosters: 0,
        EU: new Decimal(0),
    }},
    layerShown() { return player.ad.unlocked },
    tabFormat: [
        ["display-text", () => amHeaderHTML()],
        ["microtabs", "main"],
    ],
    microtabs: {
        main: {
            "dims": {
                name() { return "维度" },
                content: [ ["display-text", () => dimsGridHTML()] ],
            },
            "boost": {
                name() { return "维度提升" },
                unlocked() { return hasUpgrade("research", 17) },
                content: [ ["display-text", () => boostPanelHTML()] ],
            },
        },
    },
})

// ==================== 算力层 ====================
// 每贴 1 块「算力中心」覆盖板，MP 成本底数 -0.5（10.0 → 9.5 → … → 5.0），最多 10 块
function powerPlates() {
    return (player.machine && player.machine.plates && player.machine.plates.power) || 0
}
function mpCostBase() {
    return 10 - 0.5 * powerPlates()
}
function mpCost() {
    return Decimal.pow(mpCostBase(), player.power.MP)
}
function produceMP() {
    let cost = mpCost()
    if (player.ad.antimatter.lt(cost)) return
    player.ad.antimatter = player.ad.antimatter.sub(cost)
    player.power.MP = player.power.MP.add(1)
}
addLayer("power", {
    name: "算力", symbol: "算力",
    row: 0, position: 2,
    color: "#e6c200",
    type: "none",
    startData() { return { unlocked: false, MP: new Decimal(0) }},
    layerShown() { return player.power.unlocked },
    tabFormat: [
        ["display-text", () => `
            <h2 style="text-align:center;">
                <span style="color:#fff;">你有</span>
                <span style="color:#e6c200;">${formatWhole(player.power.MP)}</span>
                <span style="color:#fff;">算力(MP)</span>
            </h2>
        `],
        ["display-text", () => {
            let cost = mpCost()
            let can = player.ad.antimatter.gte(cost)
            let base = mpCostBase()
            let plates = powerPlates()
            let baseLine = plates > 0
                ? `<div style="color:#aaa; font-size:12px; margin-top:6px;">
                       底数: <span style="color:#e6c200;">${base.toFixed(1)}</span>
                       （已贴板 ${plates}/10）
                   </div>`
                : `<div style="color:#aaa; font-size:12px; margin-top:6px;">
                       底数: <span style="color:#e6c200;">${base.toFixed(1)}</span>
                   </div>`
            return `
                <div style="display:flex; justify-content:center; padding:20px;">
                    <div ${can?'onclick="produceMP()"':''}
                        style="border:3px solid ${can?'#a88a00':'#7a1a1a'}; border-radius:12px; padding:16px; width:260px;
                            background:${can?'#e6c200':'#c0392b'}; text-align:center;
                            cursor:${can?'pointer':'not-allowed'};
                            box-shadow:0 0 12px ${can?'#a88a00':'#7a1a1a'}; transition:0.15s;">
                        <h3 style="margin:0 0 10px 0; color:#fff; font-size:17px;">生产算力</h3>
                        <div style="color:#fff; font-size:13px;">点击生产 1 点算力(MP)</div>
                        <div style="color:#fff; font-size:13px; margin-top:12px; font-weight:bold;">
                            价格: ${format(cost)} 反物质
                        </div>
                        ${baseLine}
                    </div>
                </div>
            `
        }],
    ],
})

// ==================== 研究层 ====================
addLayer("research", {
    name: "研究", symbol: "研究",
    row: 0, position: 3,
    color: "#4a90d9",
    type: "none",
    startData() { return { unlocked: false, points: new Decimal(0) }},
    upgrades: {
        11: { title: "反物质压板配方", description: "解锁锻造层级，可以制作反物质压板",
            costText: "200反物质 + 3算力",
            multiCost: { "ad.antimatter": new Decimal(200), "power.MP": new Decimal(3) },
            unlocked() { return true },
            onPurchase() { player.forge.unlocked = true } },
        12: { title: "第二反物质维度生成器", description: "现在可以购买第二反物质维度",
            costText: "100反物质 + 4板 + 3算力",
            multiCost: { "ad.antimatter": new Decimal(100), "forge.antimatterPlate": new Decimal(4), "power.MP": new Decimal(3) },
            unlocked() { return hasUpgrade("research", 11) },
            onPurchase() {} },
        13: { title: "反物质压杆配方", description: "解锁反物质杆配方",
            costText: "20000反物质 + 5算力",
            multiCost: { "ad.antimatter": new Decimal(20000), "power.MP": new Decimal(5) },
            unlocked() { return hasUpgrade("research", 12) },
            onPurchase() { player.forge.rodUnlocked = true } },
        14: { title: "第三反物质维度生成器", description: "现在可以购买第三反物质维度",
            costText: "20000反物质 + 10板 + 5杆 + 5算力",
            multiCost: { "ad.antimatter": new Decimal(20000), "forge.antimatterPlate": new Decimal(10), "forge.antimatterRod": new Decimal(5), "power.MP": new Decimal(5) },
            unlocked() { return hasUpgrade("research", 13) },
            onPurchase() {} },
        15: { title: "反物质齿轮配方", description: "解锁反物质齿轮配方",
            costText: "1000000反物质 + 7算力",
            multiCost: { "ad.antimatter": new Decimal(1000000), "power.MP": new Decimal(7) },
            unlocked() { return hasUpgrade("research", 14) },
            onPurchase() { player.forge.gearUnlocked = true } },
        16: { title: "第四反物质维度生成器", description: "现在可以购买第四反物质维度",
            costText: "1000000反物质 + 12板 + 6杆 + 2齿轮 + 7算力",
            multiCost: { "ad.antimatter": new Decimal(1e6), "forge.antimatterPlate": new Decimal(12), "forge.antimatterRod": new Decimal(6), "forge.antimatterGear": new Decimal(2), "power.MP": new Decimal(7) },
            unlocked() { return hasUpgrade("research", 15) },
            onPurchase() {} },
        17: { title: "维度提升器", description: "解锁维度提升器",
            costText: "67676767反物质 + 20板 + 8杆 + 4齿轮 + 9算力",
            multiCost: { "ad.antimatter": new Decimal(67676767), "forge.antimatterPlate": new Decimal(20), "forge.antimatterRod": new Decimal(8), "forge.antimatterGear": new Decimal(4), "power.MP": new Decimal(9) },
            unlocked() { return hasUpgrade("research", 16) },
            onPurchase() {} },
        18: { title: "第五反物质维度生成器", description: "现在可以购买第五反物质维度",
            costText: "3e12反物质 + 24板 + 12杆 + 6齿轮 + 13算力",
            multiCost: { "ad.antimatter": new Decimal(3e12), "forge.antimatterPlate": new Decimal(24), "forge.antimatterRod": new Decimal(12), "forge.antimatterGear": new Decimal(6), "power.MP": new Decimal(13) },
            unlocked() { return hasUpgrade("research", 17) && (player.ad.boosters || 0) >= 1 },
            onPurchase() {} },
        19: { title: "第六反物质维度生成器", description: "现在可以购买第六反物质维度",
            costText: "1e18反物质 + 128板 + 64杆 + 32齿轮 + 32导线 + 19算力",
            multiCost: { "ad.antimatter": new Decimal(1e18), "forge.antimatterPlate": new Decimal(128), "forge.antimatterRod": new Decimal(64), "forge.antimatterGear": new Decimal(32), "forge.antimatterWire": new Decimal(32), "power.MP": new Decimal(19) },
            unlocked() { return hasUpgrade("research", 18) && (player.ad.boosters || 0) >= 2 },
            onPurchase() {} },
        20: { title: "反物质导线配方", description: "解锁锻造反物质导线（1000 反物质 → 1 导线）",
            costText: "1e10反物质 + 11算力",
            multiCost: { "ad.antimatter": new Decimal(1e10), "power.MP": new Decimal(11) },
            unlocked() { return hasUpgrade("research", 17) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.forge.wireUnlocked = true } },
        21: { title: "反物质发电机", description: "解锁机器页面「发电机」子页面",
            costText: "1e10反物质 + 128板 + 64杆 + 16齿轮 + 8导线",
            multiCost: { "ad.antimatter": new Decimal(1e10), "forge.antimatterPlate": new Decimal(128), "forge.antimatterRod": new Decimal(64), "forge.antimatterGear": new Decimal(16), "forge.antimatterWire": new Decimal(8) },
            unlocked() { return hasUpgrade("research", 20) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.machine.unlocked = true } },
        22: { title: "第一反物质维度自动点击器", description: "解锁机器页面「维度自动购买」子页面，自动购买第一反物质维度",
            costText: "1e10反物质 + 64板 + 16杆 + 8齿轮 + 2导线",
            multiCost: { "ad.antimatter": new Decimal(1e10), "forge.antimatterPlate": new Decimal(64), "forge.antimatterRod": new Decimal(16), "forge.antimatterGear": new Decimal(8), "forge.antimatterWire": new Decimal(2) },
            unlocked() { return hasUpgrade("research", 20) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.machine.unlocked = true } },
        23: { title: "第二反物质维度自动点击器", description: "自动购买第二反物质维度",
            costText: "5e10反物质 + 64板 + 16杆 + 8齿轮 + 2导线",
            multiCost: { "ad.antimatter": new Decimal(5e10), "forge.antimatterPlate": new Decimal(64), "forge.antimatterRod": new Decimal(16), "forge.antimatterGear": new Decimal(8), "forge.antimatterWire": new Decimal(2) },
            unlocked() { return hasUpgrade("research", 20) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.machine.unlocked = true } },
        24: { title: "第三反物质维度自动点击器", description: "自动购买第三反物质维度",
            costText: "5e10反物质 + 64板 + 16杆 + 8齿轮 + 2导线",
            multiCost: { "ad.antimatter": new Decimal(5e10), "forge.antimatterPlate": new Decimal(64), "forge.antimatterRod": new Decimal(16), "forge.antimatterGear": new Decimal(8), "forge.antimatterWire": new Decimal(2) },
            unlocked() { return hasUpgrade("research", 20) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.machine.unlocked = true } },
        25: { title: "第四反物质维度自动点击器", description: "自动购买第四反物质维度",
            costText: "5e10反物质 + 64板 + 16杆 + 8齿轮 + 2导线",
            multiCost: { "ad.antimatter": new Decimal(5e10), "forge.antimatterPlate": new Decimal(64), "forge.antimatterRod": new Decimal(16), "forge.antimatterGear": new Decimal(8), "forge.antimatterWire": new Decimal(2) },
            unlocked() { return hasUpgrade("research", 20) && (player.ad.boosters || 0) >= 1 },
            onPurchase() { player.machine.unlocked = true } },
        26: { title: "第五反物质维度自动点击器", description: "自动购买第五反物质维度",
            costText: "1e16反物质 + 128板 + 32杆 + 16齿轮 + 4导线",
            multiCost: { "ad.antimatter": new Decimal(1e16), "forge.antimatterPlate": new Decimal(128), "forge.antimatterRod": new Decimal(32), "forge.antimatterGear": new Decimal(16), "forge.antimatterWire": new Decimal(4) },
            unlocked() { return hasUpgrade("research", 22) && (player.ad.boosters || 0) >= 2 },
            onPurchase() { player.machine.unlocked = true } },
        27: { title: "奇异物质凝聚器", description: "解锁机器页面「奇异物质凝聚器」子页面",
            costText: "1e15反物质 + 256板 + 64杆 + 32齿轮 + 16导线 + 20算力",
            multiCost: { "ad.antimatter": new Decimal(1e15), "forge.antimatterPlate": new Decimal(256), "forge.antimatterRod": new Decimal(64), "forge.antimatterGear": new Decimal(32), "forge.antimatterWire": new Decimal(16), "power.MP": new Decimal(20) },
            unlocked() { return hasUpgrade("research", 26) && (player.ad.boosters || 0) >= 2 },
            onPurchase() { player.machine.unlocked = true } },
        28: { title: "压缩奇异物质配方", description: "解锁锻造「压缩奇异物质」（16 尘埃 → 1 奇异物质）",
            costText: "1e20反物质 + 21算力",
            multiCost: { "ad.antimatter": new Decimal(1e20), "power.MP": new Decimal(21) },
            unlocked() { return hasUpgrade("research", 27) },
            onPurchase() {} },
        29: { title: "奇异物质覆盖板", description: "解锁锻造「奇异物质覆盖板」配方，并解锁机器页面的「覆盖板」子页面",
            costText: "1e20反物质 + 80板 + 40杆 + 20齿轮 + 30导线 + 21算力 + 1奇异物质",
            multiCost: {
                "ad.antimatter": new Decimal(1e20),
                "forge.antimatterPlate": new Decimal(80),
                "forge.antimatterRod": new Decimal(40),
                "forge.antimatterGear": new Decimal(20),
                "forge.antimatterWire": new Decimal(30),
                "power.MP": new Decimal(21),
                "forge.singularityMatter": new Decimal(1),
            },
            unlocked() { return hasUpgrade("research", 28) },
            onPurchase() { player.forge.coatingUnlocked = true } },
    },
    tabFormat: [ ["microtabs", "main"] ],
    microtabs: {
        main: {
            "dimension": {
                name() { return "维度" },
                content: [ ["display-text", () => upgradeGridHTML("research", [12, 14, 16, 17, 18, 19])] ],
            },
            "forge": {
                name() { return "锻造" },
                content: [ ["display-text", () => upgradeGridHTML("research", [11, 13, 15, 20, 28, 29])] ],
            },
            "machine": {
                name() { return "机器" },
                unlocked() { return hasUpgrade("research", 20) },
                content: [ ["display-text", () => upgradeGridHTML("research", [21, 22, 23, 24, 25, 26, 27])] ],
            },
        },
    },
    layerShown() { return player.research.unlocked },
})

// ==================== 锻造层 ====================
function getForgeBatch() {
    return (player.ad.boosters || 0) >= 1 ? 10 : 1
}

var FORGE_RECIPES = {
    plate:    { ms: 500,   result: "antimatterPlate" },
    rod:      { ms: 1500,  result: "antimatterRod" },
    gear:     { ms: 3000,  result: "antimatterGear" },
    wire:     { ms: 2000,  result: "antimatterWire" },
    compress: { ms: 8000,  result: "singularityMatter" },
    coating:  { ms: 12000, result: "coatingPlate" },
}

function forgeCdEnabled() {
    return !(player.settings && player.settings.coolDownsEnabled === false)
}

function forgeCooking(key) {
    if (!player.forge.pending) return false
    return !!player.forge.pending[key]
}

function forgePlate() {
    if (forgeCooking("plate")) return
    let per = new Decimal(20)
    let maxN = getForgeBatch()
    let n = player.ad.antimatter.div(per).floor().min(maxN).toNumber()
    if (n <= 0) return
    player.ad.antimatter = player.ad.antimatter.sub(per.times(n))
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.plate = { start: Date.now(), n: n }
    } else {
        player.forge.antimatterPlate = player.forge.antimatterPlate.add(n)
    }
}

function forgeRod() {
    if (forgeCooking("rod")) return
    let per = new Decimal(120)
    let maxN = getForgeBatch()
    let n = player.ad.antimatter.div(per).floor().min(maxN).toNumber()
    if (n <= 0) return
    player.ad.antimatter = player.ad.antimatter.sub(per.times(n))
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.rod = { start: Date.now(), n: n }
    } else {
        player.forge.antimatterRod = player.forge.antimatterRod.add(n)
    }
}

function forgeGear() {
    if (forgeCooking("gear")) return
    let maxN = getForgeBatch()
    let aP = new Decimal(20), bP = new Decimal(4), cP = new Decimal(1)
    let n = player.ad.antimatter.div(aP).floor()
        .min(player.forge.antimatterPlate.div(bP).floor())
        .min(player.forge.antimatterRod.div(cP).floor())
        .min(maxN).toNumber()
    if (n <= 0) return
    player.ad.antimatter = player.ad.antimatter.sub(aP.times(n))
    player.forge.antimatterPlate = player.forge.antimatterPlate.sub(bP.times(n))
    player.forge.antimatterRod = player.forge.antimatterRod.sub(cP.times(n))
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.gear = { start: Date.now(), n: n }
    } else {
        player.forge.antimatterGear = player.forge.antimatterGear.add(n)
    }
}

function forgeWire() {
    if (forgeCooking("wire")) return
    let per = new Decimal(1000)
    let maxN = getForgeBatch()
    let n = player.ad.antimatter.div(per).floor().min(maxN).toNumber()
    if (n <= 0) return
    player.ad.antimatter = player.ad.antimatter.sub(per.times(n))
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.wire = { start: Date.now(), n: n }
    } else {
        player.forge.antimatterWire = player.forge.antimatterWire.add(n)
    }
}

function forgeCompress() {
    if (forgeCooking("compress")) return
    let cP = new Decimal(16)
    let dust = (player.machine && player.machine.singularityDust) || new Decimal(0)
    let n = dust.div(cP).floor().min(1).toNumber()
    if (n <= 0) return
    player.machine.singularityDust = dust.sub(cP.times(n))
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.compress = { start: Date.now(), n: n }
    } else {
        player.forge.singularityMatter = player.forge.singularityMatter.add(n)
    }
}

// 奇异物质覆盖板：1e20 AM + 40板 + 20杆 + 10齿轮 + 10导线 + 2MP + 1奇异物质 → 1 覆盖板
function forgeCoating() {
    if (forgeCooking("coating")) return
    let costs = {
        "ad.antimatter": new Decimal(1e20),
        "forge.antimatterPlate": new Decimal(40),
        "forge.antimatterRod": new Decimal(20),
        "forge.antimatterGear": new Decimal(10),
        "forge.antimatterWire": new Decimal(10),
        "power.MP": new Decimal(2),
        "forge.singularityMatter": new Decimal(1),
    }
    if (!multiAfford(costs)) return
    multiPay(costs)
    if (forgeCdEnabled()) {
        if (!player.forge.pending) player.forge.pending = {}
        player.forge.pending.coating = { start: Date.now(), n: 1 }
    } else {
        player.forge.coatingPlate = player.forge.coatingPlate.add(1)
    }
}

function forgeBatchCount(key) {
    if (key === "compress" || key === "coating") return 1
    return getForgeBatch()
}

function forgeProgressBarHTML(key, ms) {
    let t = player.timePlayed || 0
    let cdEnabled = forgeCdEnabled()
    let p = (player.forge.pending && player.forge.pending[key]) || null

    let pct = 0
    if (cdEnabled && p) {
        pct = Math.min(100, (Date.now() - p.start) / ms * 100)
    }
    let label = pct.toFixed(0) + "%"

    return `
    <div data-t="${t}" class="forgeBar" style="flex:0 0 280px; width:280px; height:44px;
        box-sizing:border-box;
        border:2px solid #7a1a1a; border-radius:12px;
        background:#1a1a1a; position:relative; overflow:hidden;">
        <div style="position:absolute; left:0; top:0; height:100%; width:${pct}%;
            background:#e74c3c; transition:width 0.06s linear;"></div>
        <div style="position:absolute; left:0; top:0; right:0; bottom:0;
            display:flex; align-items:center; justify-content:center;
            color:#fff; font-size:14px; text-shadow:0 0 4px #000; z-index:1;">
            ${label}
        </div>
    </div>`
}

function forgeRowHTML({ title, desc, onClick, canAfford, cooldownKey, cooldownMs }) {
    let t = player.timePlayed || 0

    let cdEnabled = forgeCdEnabled()
    let cooking = cdEnabled && forgeCooking(cooldownKey)
    let canBuy = canAfford && !cooking

    let batch = forgeBatchCount(cooldownKey)

    let bg, border, cursor
    if (canBuy)       { bg = "#c0392b"; border = "#e74c3c"; cursor = "pointer" }
    else if (cooking) { bg = "#3a3a3a"; border = "#555";    cursor = "default" }
    else              { bg = "#7a1a1a"; border = "#4a0f0f"; cursor = "default" }

    let handler = canBuy
        ? `onpointerdown="${onClick}; event.preventDefault();"`
        : ''

    return `
    <div data-t="${t}" class="forgeRow" style="display:flex; gap:10px; margin:10px auto;
        width:530px; align-items:stretch;">
        <div ${handler}
            style="flex:0 0 240px; width:240px; box-sizing:border-box;
                border:3px solid ${border}; border-radius:12px; padding:10px;
                background:${bg}; text-align:center; cursor:${cursor};
                box-shadow:0 0 12px ${border}; transition:0.15s;
                display:flex; flex-direction:column; justify-content:center;
                user-select:none;">
            <h3 style="margin:0 0 4px 0; color:#fff; font-size:15px;">${title}</h3>
            <div style="color:#fff; font-size:12px; line-height:1.4;">${desc}</div>
            <div style="color:#fff; font-size:13px; margin-top:6px; font-weight:bold;">本次合成: ×${batch}</div>
        </div>
        ${forgeProgressBarHTML(cooldownKey, cooldownMs)}
    </div>`
}

function forgeHeaderHTML() {
    let parts = []
    if (hasPlateUnlocked())    parts.push(`板: <span style="color:#e74c3c;">${formatWhole(player.forge.antimatterPlate)}</span>`)
    if (hasRodUnlocked())      parts.push(`杆: <span style="color:#e74c3c;">${formatWhole(player.forge.antimatterRod)}</span>`)
    if (hasGearUnlocked())     parts.push(`齿轮: <span style="color:#e74c3c;">${formatWhole(player.forge.antimatterGear)}</span>`)
    if (hasWireUnlocked())     parts.push(`导线: <span style="color:#e74c3c;">${formatWhole(player.forge.antimatterWire)}</span>`)
    if (hasSingUnlocked())     parts.push(`奇异物质: <span style="color:#e74c3c;">${formatWhole(player.forge.singularityMatter)}</span>`)
    if (hasCoatingUnlocked())  parts.push(`覆盖板: <span style="color:#e74c3c;">${formatWhole(player.forge.coatingPlate || new Decimal(0))}</span>`)
    if (parts.length === 0) return ''
    return `<h2 style="text-align:center; color:#fff;">${parts.join('&nbsp;&nbsp;')}</h2>`
}

function forgeAntiRowsHTML() {
    let rows = []

    rows.push(forgeRowHTML({
        title: "反物质压板",
        desc: `20 反物质 → 1 板`,
        canAfford: multiAfford({ "ad.antimatter": new Decimal(20) }),
        onClick: "forgePlate()",
        cooldownKey: "plate",
        cooldownMs: 500,
    }))

    if (player.forge.rodUnlocked) rows.push(forgeRowHTML({
        title: "反物质压杆",
        desc: `120 反物质 → 1 杆`,
        canAfford: multiAfford({ "ad.antimatter": new Decimal(120) }),
        onClick: "forgeRod()",
        cooldownKey: "rod",
        cooldownMs: 1500,
    }))

    if (player.forge.gearUnlocked) rows.push(forgeRowHTML({
        title: "反物质齿轮",
        desc: `20AM + 4 板 + 1 杆 → 1 齿轮`,
        canAfford: multiAfford({
            "ad.antimatter": new Decimal(20),
            "forge.antimatterPlate": new Decimal(4),
            "forge.antimatterRod": new Decimal(1),
        }),
        onClick: "forgeGear()",
        cooldownKey: "gear",
        cooldownMs: 3000,
    }))

    if (player.forge.wireUnlocked) rows.push(forgeRowHTML({
        title: "反物质导线",
        desc: `1000 反物质 → 1 导线`,
        canAfford: multiAfford({ "ad.antimatter": new Decimal(1000) }),
        onClick: "forgeWire()",
        cooldownKey: "wire",
        cooldownMs: 2000,
    }))

    return `<div style="display:flex; flex-direction:column; align-items:center;">${rows.join('')}</div>`
}

function forgeSingRowsHTML() {
    let rows = []

    if (hasUpgrade("research", 28)) {
        rows.push(forgeRowHTML({
            title: "压缩奇异物质",
            desc: `16 尘埃 → 1 奇异物质`,
            canAfford: ((player.machine && player.machine.singularityDust) || new Decimal(0)).gte(16),
            onClick: "forgeCompress()",
            cooldownKey: "compress",
            cooldownMs: 8000,
        }))
    } else {
        rows.push(`
            <div style="color:#aaa; padding:20px; text-align:center; font-size:14px;">
                完成研究「压缩奇异物质配方」后解锁此配方
            </div>
        `)
    }

    if (hasCoatingUnlocked()) {
        let coatCosts = {
            "ad.antimatter": new Decimal(1e20),
            "forge.antimatterPlate": new Decimal(40),
            "forge.antimatterRod": new Decimal(20),
            "forge.antimatterGear": new Decimal(10),
            "forge.antimatterWire": new Decimal(10),
            "power.MP": new Decimal(2),
            "forge.singularityMatter": new Decimal(1),
        }
        rows.push(forgeRowHTML({
            title: "奇异物质覆盖板",
            desc: `1e20AM + 40板 + 20杆 + 10齿轮 + 10导线 + 2算力 + 1奇异物质 → 1 覆盖板`,
            canAfford: multiAfford(coatCosts),
            onClick: "forgeCoating()",
            cooldownKey: "coating",
            cooldownMs: 12000,
        }))
    } else {
        rows.push(`
            <div style="color:#aaa; padding:20px; text-align:center; font-size:14px;">
                完成研究「奇异物质覆盖板」后解锁此配方
            </div>
        `)
    }

    return `<div style="display:flex; flex-direction:column; align-items:center;">${rows.join('')}</div>`
}

addLayer("forge", {
    name: "锻造", symbol: "锻造",
    row: 0, position: 4,
    color: "#c0392b",
    type: "none",
    startData() { return {
        unlocked: false,
        antimatterPlate: new Decimal(0),
        antimatterRod: new Decimal(0),
        antimatterGear: new Decimal(0),
        antimatterWire: new Decimal(0),
        singularityMatter: new Decimal(0),
        coatingPlate: new Decimal(0),
        rodUnlocked: false,
        gearUnlocked: false,
        wireUnlocked: false,
        coatingUnlocked: false,
        pending: {},
    }},
    layerShown() { return player.forge.unlocked },

    update(diff) {
        if (!player.forge.pending) return
        if (!forgeCdEnabled()) return
        let now = Date.now()
        for (let key in FORGE_RECIPES) {
            let p = player.forge.pending[key]
            if (p && now - p.start >= FORGE_RECIPES[key].ms) {
                let res = FORGE_RECIPES[key].result
                player.forge[res] = player.forge[res].add(p.n)
                player.forge.pending[key] = null
            }
        }
    },

    tabFormat: [
        ["display-text", () => forgeHeaderHTML()],
        ["microtabs", "main"],
    ],
    microtabs: {
        main: {
            "antimatter": {
                name() { return "反物质产物" },
                content: [ ["display-text", () => forgeAntiRowsHTML()] ],
            },
            "singularity": {
                name() { return "奇异物质产物" },
                unlocked() { return hasSingUnlocked() },
                content: [ ["display-text", () => forgeSingRowsHTML()] ],
            },
        },
    },
})

// ==================== 机器层 ====================
// 🎨 灰色
var inputFocused = false
var _genCache = ''
var _autoCache = ''
var _singCache = ''

function generatorPanelHTML() {
    if (inputFocused && _genCache) return _genCache

    let rate = player.machine.genRate
    let actualAM = player.machine.lastActualAM || new Decimal(0)
    let actualEU = player.machine.lastEU || new Decimal(0)

    let html = `
    <div style="padding:20px; text-align:center;">
        <h3 style="color:#95a5a6; margin-bottom:20px;">反物质发电机</h3>
        <div style="margin:16px 0;">
            <label style="color:#fff; font-size:15px;">每秒消耗反物质: </label>
            <input type="number" value="${rate}"
                onfocus="inputFocused = true"
                onblur="inputFocused = false; updateTabFormats()"
                oninput="player.machine.genRate = Math.max(0, parseFloat(this.value) || 0)"
                style="width:150px; padding:6px; border-radius:6px; border:1px solid #95a5a6;
                    background:#1a1a1a; color:#fff; font-size:14px;">
            <span style="color:#fff;">AM/s</span>
        </div>
        <div style="color:#fff; line-height:2.2; font-size:15px; margin-top:20px;">
            当前反物质消耗速度: <span style="color:#95a5a6;">${format(actualAM)}</span> AM/s<br>
            当前发电速度: <span style="color:#95a5a6;">${format(actualEU)}</span> EU/s<br>
            <span style="color:#aaa; font-size:13px;">（EU/s = √(AM/s)）</span>
        </div>
    </div>
    `
    _genCache = html
    return html
}

function singularityPanelHTML() {
    if (inputFocused && _singCache) return _singCache

    let rate = player.machine.singularityRate || 0
    let storedAM = player.machine.singularityAM || new Decimal(0)
    let dust = player.machine.singularityDust || new Decimal(0)
    let timer = player.machine.singularityTimer || 0
    let countdown = Math.max(0, 10 - timer)

    let singPlates = (player.machine.plates && player.machine.plates.singularity) || 0
    let base = 10 - 0.5 * singPlates

    let nextDust = new Decimal(0)
    if (storedAM.gte(1)) {
        nextDust = storedAM.ln().div(Math.log(base)).times(100).floor().div(100)
    }

    let html = `
    <div style="padding:20px; text-align:center;">
        <h3 style="color:#95a5a6; margin-bottom:20px;">奇异物质凝聚器</h3>
        <div style="margin:16px 0;">
            <label style="color:#fff; font-size:15px;">每秒消耗反物质: </label>
            <input type="number" value="${rate}"
                onfocus="inputFocused = true"
                onblur="inputFocused = false; updateTabFormats()"
                oninput="player.machine.singularityRate = Math.max(0, parseFloat(this.value) || 0)"
                style="width:150px; padding:6px; border-radius:6px; border:1px solid #95a5a6;
                    background:#1a1a1a; color:#fff; font-size:14px;">
            <span style="color:#fff;">AM/s</span>
        </div>
        <div style="color:#fff; line-height:2.2; font-size:15px; margin-top:20px;">
            机器内反物质总量: <span style="color:#95a5a6;">${format(storedAM)}</span> AM<br>
            奇异物质尘埃: <span style="color:#95a5a6;">${format(dust)}</span><br>
            下次产出倒计时: <span style="color:#95a5a6;">${countdown.toFixed(1)}</span> 秒<br>
            <span style="color:#aaa; font-size:13px;">（每 10 秒产出 log_${base.toFixed(1)}(存量) 尘埃，保留 2 位小数）</span><br>
            <span style="color:#aaa; font-size:13px;">下次预计产出: ${nextDust.gt(0) ? nextDust.toFixed(2) : "0"} 尘埃</span>
        </div>
    </div>
    `
    _singCache = html
    return html
}

function autoDimUnlocked(n) {
    return hasUpgrade("research", 21 + n)
}

// 每个维度独立的间隔输入
function autoBuyPanelHTML() {
    if (inputFocused && _autoCache) return _autoCache

    let autoPlates = (player.machine.plates && player.machine.plates.autoBuy) || 0
    let minInterval = 0.1 / Math.pow(10, autoPlates)

    if (!player.machine.autoIntervals) player.machine.autoIntervals = {1:1,2:1,3:1,4:1,5:1}

    let rows = ''
    let totalEuRate = new Decimal(0)
    let unlockedCount = 0
    for (let n = 1; n <= 5; n++) {
        let on = autoDimUnlocked(n)
        let interval = Math.max(minInterval, player.machine.autoIntervals[n] || 1)
        let euRate = new Decimal(1e4).div(interval)
        if (on) { totalEuRate = totalEuRate.add(euRate); unlockedCount++ }
        
        // 格式化输入框的 value，防止 0.003125 这种长小数
        let intervalStr = interval < 0.01 ? interval.toExponential(0) : interval.toString()
        
        rows += `
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin:8px 0; color:${on?'#fff':'#666'};">
                <span style="width:130px; text-align:right;">第 ${n} 反物质维度:</span>
                <input type="number" step="0.01" min="${minInterval}" value="${intervalStr}"
                    ${on?'':'disabled'}
                    onfocus="inputFocused = true"
                    onblur="inputFocused = false; updateTabFormats()"
                    oninput="player.machine.autoIntervals[${n}] = Math.max(${minInterval}, parseFloat(this.value) || ${minInterval})"
                    style="width:120px; padding:4px; border-radius:6px; border:1px solid #95a5a6;
                        background:#1a1a1a; color:#fff; font-size:13px;">
                <span style="width:30px;">秒</span>
                <span style="width:130px; font-size:12px; color:${on?'#95a5a6':'#666'};">
                    ${on?`(${format(euRate)} EU/s)`:'未解锁'}
                </span>
            </div>
        `
    }

    let html = `
    <div style="padding:20px; text-align:center;">
        <h3 style="color:#95a5a6; margin-bottom:20px;">维度自动购买</h3>
        ${rows}
        <div style="color:#fff; line-height:2.2; font-size:15px; margin-top:20px;">
            当前 EU 总消耗速度: <span style="color:#95a5a6;">${format(totalEuRate)}</span> EU/s<br>
            <span style="color:#aaa; font-size:13px;">（每维度每次消耗 1e4 EU，当前最低间隔 ${minInterval < 0.001 ? minInterval.toExponential(0) : minInterval.toFixed(3)}s）</span>
        </div>
        <div style="color:${unlockedCount>0?'#95a5a6':'#888'}; margin-top:16px; font-size:14px;">
            ${unlockedCount > 0 ? `● 已启用 ${unlockedCount} 个自动购买器` : '● 尚未解锁任何自动购买器'}
        </div>
    </div>
    `
    _autoCache = html
    return html
}

// ==================== 覆盖板子页面 ====================
// 消耗 cost 个覆盖板，为目标贴 1 板（不超过 max）
function attachPlate(target, cost, max) {
    if (!player.machine.plates) player.machine.plates = {}
    let have = (player.forge && player.forge.coatingPlate) || new Decimal(0)
    let current = player.machine.plates[target] || 0
    if (current >= max) return
    if (have.lt(cost)) return
    player.forge.coatingPlate = have.sub(cost)
    player.machine.plates[target] = current + 1
    needCanvasUpdate = true
    updateTabFormats()
}

// 单张覆盖板卡片
function plateCardHTML(id, title, info, maxPlates, cost) {
    let plates = (player.machine.plates && player.machine.plates[id]) || 0
    let have = (player.forge && player.forge.coatingPlate) || new Decimal(0)
    let canAttach = have.gte(cost) && plates < maxPlates
    let btn = "border-radius:6px; padding:4px 8px; font-size:12px; border:1px solid #4BDC13;"

    return `
    <div style="border:2px solid #0d5c0d; border-radius:10px; padding:10px; width:180px; background:#1a1a1a; text-align:center; box-shadow:0 0 8px #0d5c0d;">
        <h4 style="margin:0 0 6px 0; color:#4BDC13; font-size:14px;">${title}</h4>
        <div style="color:#fff; font-size:12px; line-height:1.5; min-height:34px;">${info}</div>
        <div style="color:#fff; font-size:13px; margin-top:6px;">已贴板: <span style="color:#4BDC13;">${plates} / ${maxPlates}</span></div>
        <div style="display:flex; justify-content:center; margin-top:8px;">
            <button onclick="attachPlate('${id}', ${cost}, ${maxPlates})" ${canAttach?'':'disabled'}
                style="background:${canAttach?'#0d5c0d':'#333'}; color:${canAttach?'#fff':'#888'}; ${btn} cursor:${canAttach?'pointer':'not-allowed'};">
                贴板 (消耗 ${cost})
            </button>
        </div>
    </div>`
}

function platePanelHTML() {
    let cards = []

    if (hasUpgrade("research", 21)) {
        let plates = (player.machine.plates && player.machine.plates.generator) || 0
        let exp = 0.5 + 0.01 * plates
        let info = `消耗速率: <span style="color:#4BDC13;">${format(player.machine.lastActualAM || new Decimal(0))}</span> AM/s<br>发电指数: <span style="color:#4BDC13;">${exp.toFixed(2)}</span>`
        cards.push(plateCardHTML("generator", "反物质发电机", info, 20, 1))
    }

    if (hasUpgrade("research", 27)) {
        let plates = (player.machine.plates && player.machine.plates.singularity) || 0
        let base = 10 - 0.5 * plates
        let info = `消耗速率: <span style="color:#4BDC13;">${format(player.machine.singularityRate || 0)}</span> AM/s<br>log 底数: <span style="color:#4BDC13;">${base.toFixed(1)}</span>`
        cards.push(plateCardHTML("singularity", "奇异物质凝聚器", info, 10, 1))
    }

    let hasAnyAuto = false
    for (let n = 1; n <= 5; n++) if (autoDimUnlocked(n)) { hasAnyAuto = true; break }
    if (hasAnyAuto) {
        let plates = (player.machine.plates && player.machine.plates.autoBuy) || 0
        let minInt = 0.1 / Math.pow(10, plates)
        // 格式化卡片信息
        let minIntStr = minInt < 0.001 ? minInt.toExponential(0) : minInt.toFixed(3)
        let info = `当前最低间隔: <span style="color:#4BDC13;">${minIntStr}</span> s`
        cards.push(plateCardHTML("autoBuy", "维度自动购买器", info, 3, 1))
    }

    if (player.power.unlocked) {
        let plates = (player.machine.plates && player.machine.plates.power) || 0
        let base = 10 - 0.5 * plates
        let info = `MP 成本底数: <span style="color:#4BDC13;">${base.toFixed(1)}</span>`
        cards.push(plateCardHTML("power", "算力中心", info, 10, 1))
    }

    let have = (player.forge && player.forge.coatingPlate) || new Decimal(0)

    return `
    <div style="text-align:center; padding:14px 0 4px 0;">
        <div style="color:#fff; font-size:15px;">
            奇异物质覆盖板: <span style="color:#4BDC13; font-size:20px;">${formatWhole(have)}</span>
        </div>
    </div>
    <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:12px; padding:10px;">
        ${cards.join('')}
    </div>
    `
}

addLayer("machine", {
    name: "机器", symbol: "机器",
    row: 0, position: 5,
    color: "#95a5a6",
    type: "none",
    startData() { return {
        unlocked: false,
        points: new Decimal(0),
        genRate: 0,
        autoIntervals: {1:1, 2:1, 3:1, 4:1, 5:1},
        autoTimers: {1:0, 2:0, 3:0, 4:0, 5:0},
        lastActualAM: new Decimal(0),
        lastEU: new Decimal(0),
        singularityRate: 0,
        singularityAM: new Decimal(0),
        singularityDust: new Decimal(0),
        singularityTimer: 0,
        plates: {},
    }},
    layerShown() { return player.machine.unlocked },

    update(diff) {
        // —— 兼容旧存档 ——
        if (!player.machine.autoIntervals) player.machine.autoIntervals = {1:1, 2:1, 3:1, 4:1, 5:1}
        if (!player.machine.autoTimers)    player.machine.autoTimers    = {1:0, 2:0, 3:0, 4:0, 5:0}

        // —— 发电机 ——
        let want = new Decimal(player.machine.genRate).times(diff)
        let actual = player.ad.antimatter.min(want)

        if (actual.gt(0)) {
            player.ad.antimatter = player.ad.antimatter.sub(actual)
            let rate = actual.div(diff)
            let genPlates = (player.machine.plates && player.machine.plates.generator) || 0
            let exponent = 0.5 + 0.01 * genPlates
            let euRate = rate.pow(exponent)
            player.ad.EU = (player.ad.EU || new Decimal(0)).add(euRate.times(diff))
            player.machine.lastActualAM = rate
            player.machine.lastEU = euRate
        } else {
            player.machine.lastActualAM = new Decimal(0)
            player.machine.lastEU = new Decimal(0)
        }

        // —— 奇异物质凝聚器 ——
        let singRate = new Decimal(player.machine.singularityRate || 0)
        if (singRate.gt(0)) {
            let singWant = singRate.times(diff)
            let singActual = player.ad.antimatter.min(singWant)
            if (singActual.gt(0)) {
                player.ad.antimatter = player.ad.antimatter.sub(singActual)
                player.machine.singularityAM = (player.machine.singularityAM || new Decimal(0)).add(singActual)
            }
        }

        player.machine.singularityTimer = (player.machine.singularityTimer || 0) + diff
        let singIter = 100
        while (player.machine.singularityTimer >= 10 && singIter-- > 0) {
            player.machine.singularityTimer -= 10
            let stored = player.machine.singularityAM || new Decimal(0)
            if (stored.gte(1)) {
                let singPlates = (player.machine.plates && player.machine.plates.singularity) || 0
                let base = 10 - 0.5 * singPlates
                let gain = stored.ln().div(Math.log(base)).times(100).floor().div(100)
                player.machine.singularityDust = (player.machine.singularityDust || new Decimal(0)).add(gain)
                player.machine.singularityAM = new Decimal(0)
            }
        }

        // —— 自动购买维度（每维度独立计时） ——
        let autoPlates = (player.machine.plates && player.machine.plates.autoBuy) || 0
        let minInterval = 0.1 / Math.pow(10, autoPlates)

        for (let n = 1; n <= 5; n++) {
            if (!autoDimUnlocked(n)) continue
            let interval = Math.max(minInterval, player.machine.autoIntervals[n] || 1)
            player.machine.autoTimers[n] = (player.machine.autoTimers[n] || 0) + diff
            let iter = 100
            while (player.machine.autoTimers[n] >= interval && iter-- > 0) {
                if ((player.ad.EU || new Decimal(0)).gte(1e4)) {
                    player.ad.EU = player.ad.EU.sub(1e4)
                    genDim(n, true)
                    player.machine.autoTimers[n] -= interval
                } else break
            }
        }
    },

    tabFormat: [ ["microtabs", "main"] ],
    microtabs: {
        main: {
            "generator": {
                name() { return "发电机" },
                unlocked() { return hasUpgrade("research", 21) },
                content: [ ["display-text", () => generatorPanelHTML()] ],
            },
            "autoBuy": {
                name() { return "维度自动购买" },
                unlocked() { return hasUpgrade("research", 22) },
                content: [ ["display-text", () => autoBuyPanelHTML()] ],
            },
            "singularity": {
                name() { return "奇异物质凝聚器" },
                unlocked() { return hasUpgrade("research", 27) },
                content: [ ["display-text", () => singularityPanelHTML()] ],
            },
            "coating": {
                name: "覆盖板" ,
                unlocked() { return hasCoatingUnlocked() },
                content: [ ["display-text", () => platePanelHTML()] ],
            },
        },
    },
})
