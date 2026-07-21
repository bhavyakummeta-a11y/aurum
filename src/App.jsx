import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './role.css'
import aurumLogo from './assets/aurum-logo.png'
import {
  createAccount,
  firebaseReady,
  getUserProfile,
  saveOrder,
  signInWithEmail,
  signInWithGoogleRole,
  signOutUser,
  subscribeToUser,
} from './firebase'

const products = [
  { id: 1, name: 'Swiss 1 oz Gold Bar', category: 'Gold', price: 2410, weight: 1.2, dimensions: [3.2, 1.8, 0.3], origin: 'Switzerland', condition: 'Assay sealed', rarity: 'Investment grade', eta: '2 day vault dispatch', image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1100&q=80' },
  { id: 2, name: 'Liberty Head Eagle Coin', category: 'Coins', price: 1850, weight: 0.75, dimensions: [1.2, 1.2, 0.1], origin: 'United States', condition: 'Very fine', rarity: 'Low mintage', eta: '3 day insured transit', image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1100&q=80' },
  { id: 3, name: 'Victorian Brass Compass', category: 'Antiques', price: 640, weight: 1.8, dimensions: [5.5, 5.5, 2.5], origin: 'England', condition: 'Restored', rarity: 'Collector select', eta: 'Crated delivery', image: 'https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?auto=format&fit=crop&w=1100&q=80' },
  { id: 4, name: 'Byzantine Gold Solidus', category: 'Coins', price: 3200, weight: 0.35, dimensions: [1, 1, 0.08], origin: 'Eastern Mediterranean', condition: 'Authenticated', rarity: 'Ancient issue', eta: 'Vault handoff', image: 'https://images.unsplash.com/photo-1633158829875-e5316a358c6f?auto=format&fit=crop&w=1100&q=80' },
  { id: 5, name: 'Art Deco Gold Bracelet', category: 'Gold', price: 4280, weight: 0.9, dimensions: [7, 2.4, 1.2], origin: 'France', condition: 'Estate verified', rarity: 'One available', eta: 'White glove ready', image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1100&q=80' },
  { id: 6, name: '19th Century Silver Inkwell', category: 'Antiques', price: 980, weight: 3.6, dimensions: [8, 5, 4.5], origin: 'Italy', condition: 'Museum grade', rarity: 'Archivist pick', eta: 'Protective crate', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1100&q=80' },
  { id: 7, name: 'Pamp Fortuna Gold Pendant', category: 'Gold', price: 1290, weight: 0.42, dimensions: [1.8, 1.1, 0.18], origin: 'Switzerland', condition: 'New old stock', rarity: 'Gift ready', eta: '2 day delivery', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1100&q=80' },
  { id: 8, name: 'Ming Dynasty Porcelain Cup', category: 'Antiques', price: 7400, weight: 2.4, dimensions: [6.2, 6.2, 4.4], origin: 'China', condition: 'Provenance file', rarity: 'Private estate', eta: 'Specialist packing', image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1100&q=80' },
]

const pages = [['home', 'Home'], ['collection', 'Collection'], ['shipping', 'Shipping'], ['checkout', 'Checkout']]
const roleLabels = { collector: 'Collector', consignor: 'Consignor' }
const categories = ['All', 'Gold', 'Coins', 'Antiques']
const searchIntents = [
  { label: 'Investment gold', query: 'gold investment assay sealed swiss' },
  { label: 'Ancient coins', query: 'ancient coin authenticated byzantine' },
  { label: 'Estate jewelry', query: 'estate gold bracelet france' },
  { label: 'Museum antiques', query: 'museum antique provenance restored' },
]
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function dimWeight(dimensions) {
  const [length, width, height] = dimensions
  return (length * width * height) / 139
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function getSearchText(product) {
  return normalizeText(`${product.name} ${product.category} ${product.origin} ${product.condition} ${product.rarity} ${product.eta}`)
}

function rankProduct(product, query) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return 1

  const tokens = normalizedQuery.split(' ').filter(Boolean)
  const haystack = getSearchText(product)
  const name = normalizeText(product.name)
  const category = normalizeText(product.category)
  const rarity = normalizeText(product.rarity)

  return tokens.reduce((score, token) => {
    if (name.includes(token)) return score + 8
    if (category.includes(token)) return score + 6
    if (rarity.includes(token)) return score + 5
    if (haystack.includes(token)) return score + 3
    return score
  }, haystack.includes(normalizedQuery) ? 10 : 0)
}

function App() {
  const [activePage, setActivePage] = useState('home')
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState('relevance')
  const [cart, setCart] = useState({})
  const [zip, setZip] = useState('10001')
  const [international, setInternational] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [addedItem, setAddedItem] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(products[4])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('sign-in')
  const [authRole, setAuthRole] = useState('collector')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authError, setAuthError] = useState('')
  const [orderStatus, setOrderStatus] = useState('')

  useEffect(() => subscribeToUser(setUser), [])

  useEffect(() => {
    let active = true
    if (!user) {
      setUserProfile(null)
      return () => { active = false }
    }
    getUserProfile(user.uid)
      .then((profile) => { if (active) setUserProfile(profile) })
      .catch(() => { if (active) setUserProfile(null) })
    return () => { active = false }
  }, [user])

  function changePage(page) {
    if (page === activePage) return
    if (document.startViewTransition) document.startViewTransition(() => setActivePage(page))
    else setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const searchResults = useMemo(() => {
    const ranked = products
      .map((product) => ({ product, score: rankProduct(product, query) }))
      .filter(({ product, score }) => {
        const inCategory = activeCategory === 'All' || product.category === activeCategory
        return inCategory && score > 0
      })

    return ranked.sort((a, b) => {
      if (sortMode === 'price-low') return a.product.price - b.product.price
      if (sortMode === 'price-high') return b.product.price - a.product.price
      if (sortMode === 'weight') return b.product.weight - a.product.weight
      return b.score - a.score || a.product.price - b.product.price
    })
  }, [activeCategory, query, sortMode])

  const visibleProducts = searchResults.map(({ product }) => product)
  const searchSignals = useMemo(() => {
    const top = searchResults[0]
    const categoriesFound = [...new Set(visibleProducts.map((product) => product.category))]
    const avgPrice = visibleProducts.length ? visibleProducts.reduce((sum, product) => sum + product.price, 0) / visibleProducts.length : 0
    return {
      topMatch: top?.product.name || 'No match yet',
      categories: categoriesFound.join(', ') || 'Try a broader search',
      avgPrice,
    }
  }, [searchResults, visibleProducts])

  const cartItems = useMemo(
    () => products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] })),
    [cart],
  )

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const favorite = products.find((product) => product.id === 5)
  const navPages = user ? [...pages, ['dashboard', userProfile?.role === 'consignor' ? 'Consignor desk' : 'Dashboard']] : pages

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const actualWeight = cartItems.reduce((sum, item) => sum + item.weight * item.quantity, 0)
    const dimensionalWeight = cartItems.reduce((sum, item) => sum + dimWeight(item.dimensions) * item.quantity, 0)
    const billableWeight = Math.max(actualWeight, dimensionalWeight)
    const zone = international ? 8 : Number(zip[0] || 1) > 5 ? 5 : 2
    const shipping = cartItems.length ? Math.round(18 + billableWeight * 7.5 + zone * 9) : 0
    const duties = international ? Math.round(subtotal * 0.065) : 0
    const insurance = cartItems.length ? Math.round(subtotal * 0.012) : 0
    return { subtotal, actualWeight, dimensionalWeight, billableWeight, zone, shipping, duties, insurance, grandTotal: subtotal + shipping + duties + insurance }
  }, [cartItems, international, zip])

  const packingPlan = useMemo(() => {
    if (!cartItems.length) return { box: 'Awaiting cart', voidFill: '0%', risk: 'No items selected', carrier: 'Aurum Vault' }
    const maxLength = Math.max(...cartItems.map((item) => item.dimensions[0]))
    const maxWidth = Math.max(...cartItems.map((item) => item.dimensions[1]))
    const stackedHeight = cartItems.reduce((sum, item) => sum + item.dimensions[2] * item.quantity, 0)
    const fragile = cartItems.some((item) => item.category === 'Antiques')
    return {
      box: `${Math.ceil(maxLength + 2)} x ${Math.ceil(maxWidth + 2)} x ${Math.ceil(stackedHeight + 2)} in`,
      voidFill: fragile ? '32%' : '18%',
      risk: fragile ? 'Fragile packing required' : 'Stackable vault pack',
      carrier: international ? 'DHL MyGTS estimate' : totals.zone > 4 ? 'UPS insured zone rate' : 'FedEx vault rate',
    }
  }, [cartItems, international, totals.zone])

  function addToCart(id) {
    const product = products.find((item) => item.id === id)
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }))
    setAddedItem(product)
    window.setTimeout(() => setAddedItem(null), 2400)
  }

  function addAndOpen(id) {
    addToCart(id)
    setCartOpen(true)
  }

  function changeQuantity(id, amount) {
    setCart((current) => {
      const nextQuantity = Math.max((current[id] || 0) + amount, 0)
      const next = { ...current }
      if (nextQuantity === 0) delete next[id]
      else next[id] = nextQuantity
      return next
    })
  }

  function beginCheckout() {
    if (!cartItems.length) return
    setActivePage('checkout')
    setCheckoutOpen(true)
    setCheckoutStep(user ? 2 : 1)
    setCartOpen(false)
    setOrderStatus('')
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    try {
      if (authMode === 'create') await createAccount(authForm.email, authForm.password, authRole)
      else await signInWithEmail(authForm.email, authForm.password, authRole)
      setAuthOpen(false)
      setActivePage('dashboard')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function handleGoogleSignIn() {
    setAuthError('')
    try {
      await signInWithGoogleRole(authRole)
      setAuthOpen(false)
      setActivePage('dashboard')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function handleSignOut() {
    setAuthError('')
    try {
      await signOutUser()
      setActivePage('home')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function placeOrder() {
    setOrderStatus('Saving reservation...')
    try {
      await saveOrder({
        userId: user?.uid || 'guest',
        email: user?.email || authForm.email || 'guest',
        items: cartItems.map(({ id, name, price, quantity, category }) => ({ id, name, price, quantity, category })),
        totals,
        shipping: { zip, international, packingPlan },
      })
      setOrderStatus('Reservation saved to Firestore.')
      setCart({})
      window.setTimeout(() => setCheckoutOpen(false), 1400)
    } catch (error) {
      setOrderStatus(error.message)
    }
  }

  return (
    <main>
      {addedItem && <div className="toast"><span>Added to vault cart</span><strong>{addedItem.name}</strong></div>}

      <header className="topbar">
        <button className="brand brand-button logo-brand" onClick={() => changePage('home')} type="button" aria-label="Aurum home"><img src={aurumLogo} alt="Aurum logo" /></button>
        <nav className="section-tabs" aria-label="Primary navigation">
          {navPages.map(([id, label]) => <button className={activePage === id ? 'active' : ''} onClick={() => changePage(id)} type="button" key={id}>{label}</button>)}
        </nav>
        <div className="top-actions">{user ? <><button className="account-trigger" onClick={() => changePage('dashboard')} type="button">{roleLabels[userProfile?.role] || 'Account'}</button><button className="account-trigger" onClick={handleSignOut} type="button">Sign out</button></> : <button className="account-trigger" onClick={() => setAuthOpen(true)} type="button">Sign in</button>}<button className="cart-trigger" onClick={() => setCartOpen(true)} type="button"><span>Cart</span><strong>{cartCount}</strong></button></div>
      </header>

      <div className="page-shell" key={activePage}>
        {activePage === 'home' && <HomeView favorite={favorite} user={user} addAndOpen={addAndOpen} firebaseReady={firebaseReady} changePage={changePage} />}
        {activePage === 'collection' && <CollectionView visibleProducts={visibleProducts} activeCategory={activeCategory} setActiveCategory={setActiveCategory} query={query} setQuery={setQuery} sortMode={sortMode} setSortMode={setSortMode} searchSignals={searchSignals} addToCart={addToCart} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} addAndOpen={addAndOpen} />}
        {activePage === 'shipping' && <ShippingView zip={zip} setZip={setZip} international={international} setInternational={setInternational} totals={totals} packingPlan={packingPlan} />}
        {activePage === 'checkout' && <CheckoutView cartCount={cartCount} cartItems={cartItems} changeQuantity={changeQuantity} totals={totals} beginCheckout={beginCheckout} />}
        {activePage === 'dashboard' && <DashboardView user={user} profile={userProfile} changePage={changePage} openAuth={() => setAuthOpen(true)} />}
      </div>

      {cartOpen && <CartDrawer cartCount={cartCount} cartItems={cartItems} changeQuantity={changeQuantity} totals={totals} beginCheckout={beginCheckout} close={() => setCartOpen(false)} />}
      {checkoutOpen && <CheckoutModal checkoutStep={checkoutStep} setCheckoutStep={setCheckoutStep} user={user} openAuth={() => setAuthOpen(true)} totals={totals} orderStatus={orderStatus} placeOrder={placeOrder} close={() => setCheckoutOpen(false)} />}
      {authOpen && <AuthModal authMode={authMode} setAuthMode={setAuthMode} authRole={authRole} setAuthRole={setAuthRole} authForm={authForm} setAuthForm={setAuthForm} authError={authError} handleAuthSubmit={handleAuthSubmit} handleGoogleSignIn={handleGoogleSignIn} close={() => setAuthOpen(false)} />}
    </main>
  )
}

function HomeView({ favorite, user, addAndOpen, firebaseReady, changePage }) {
  return <><section className="hero page-view"><div className="hero-media" aria-hidden="true" /><div className="hero-content"><p className="eyebrow">Authenticated precious assets</p><h1>Aurum</h1><p>A premium marketplace for investment gold, rare coins, and antique objects with intelligent shipping estimates before checkout.</p><div className="hero-actions"><button className="button primary" onClick={() => changePage('collection')} type="button">Shop collection</button><button className="button secondary" onClick={() => addAndOpen(favorite.id)} type="button">Reserve featured piece</button></div></div></section><section className="trust-band flow-bridge" aria-label="Store assurances"><div><span>01</span> Third-party authentication</div><div><span>02</span> DIM weight rate previews</div><div><span>03</span> Cross-border duty estimates</div><div><span>04</span> Insured signature delivery</div></section><section className="market-strip flow-bridge" aria-label="Market highlights"><div><span>Gold desk</span><strong>Spot-aware placeholders</strong></div><div><span>Vault score</span><strong>98.6% verified lots</strong></div><div><span>Firebase</span><strong>{firebaseReady ? 'Auth and Firestore enabled' : 'Add env values to enable'}</strong></div></section></>
}

function CollectionView({ visibleProducts, activeCategory, setActiveCategory, query, setQuery, sortMode, setSortMode, searchSignals, addToCart, selectedProduct, setSelectedProduct, addAndOpen }) {
  return <><section className="collection page-view"><div className="section-head discovery-head"><div><p className="eyebrow">Curated inventory</p><h2>Gold, coins, and antiques</h2></div><div className="discovery-controls"><label className="search-box"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ancient coin, assay, estate, museum" /></label><label className="sort-box"><span>Sort</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="relevance">Relevance</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option><option value="weight">Heaviest first</option></select></label></div></div><div className="intent-row" aria-label="Suggested searches">{searchIntents.map((intent) => <button key={intent.label} onClick={() => setQuery(intent.query)} type="button">{intent.label}</button>)}{query && <button className="clear-search" onClick={() => setQuery('')} type="button">Clear search</button>}</div><div className="category-tabs" role="tablist" aria-label="Categories">{categories.map((category) => <button key={category} className={category === activeCategory ? 'active' : ''} onClick={() => setActiveCategory(category)} type="button">{category}</button>)}</div><div className="search-intel" aria-label="Search intelligence"><div><span>Results</span><strong>{visibleProducts.length}</strong></div><div><span>Top match</span><strong>{searchSignals.topMatch}</strong></div><div><span>Categories</span><strong>{searchSignals.categories}</strong></div><div><span>Avg. price</span><strong>{visibleProducts.length ? money.format(searchSignals.avgPrice) : '-'}</strong></div></div>{visibleProducts.length === 0 ? <div className="empty-results"><p className="eyebrow">No matched lots</p><h3>Try a broader collector phrase.</h3><p>Search by material, era, country, condition, rarity, or delivery need.</p><button onClick={() => { setQuery('gold coin authenticated'); setActiveCategory('All') }} type="button">Search authenticated gold coins</button></div> : <div className="product-grid">{visibleProducts.map((product, index) => <article className="product-card" style={{ '--delay': `${index * 70}ms` }} key={product.id} onMouseEnter={() => setSelectedProduct(product)}><button className="image-button" onClick={() => setSelectedProduct(product)} type="button"><img src={product.image} alt="" /><span>{product.rarity}</span></button><div className="product-body"><div className="product-meta"><span>{product.category}</span><span>{product.condition}</span></div><h3>{product.name}</h3><p>{product.origin} · {product.eta}</p><dl><div><dt>Weight</dt><dd>{product.weight.toFixed(2)} lb</dd></div><div><dt>Size</dt><dd>{product.dimensions.join(' x ')} in</dd></div></dl><div className="product-footer"><strong>{money.format(product.price)}</strong><button className="add-button" onClick={() => addToCart(product.id)} type="button">Add to cart</button></div></div></article>)}</div>}</section><section className="showcase flow-feature" aria-label="Selected item detail"><div className="showcase-copy"><p className="eyebrow">Object focus</p><h2>{selectedProduct.name}</h2><p>{selectedProduct.condition} from {selectedProduct.origin}. Includes placeholder provenance, insured packing, dimensional-weight shipping estimate, and buyer review before checkout.</p><div className="certificate"><span>Certificate ID</span><strong>AUR-{selectedProduct.id}9{selectedProduct.category.slice(0, 2).toUpperCase()}-VAULT</strong></div><button onClick={() => addAndOpen(selectedProduct.id)} type="button">Reserve this asset</button></div><img src={selectedProduct.image} alt="" /></section></>
}

function ShippingView({ zip, setZip, international, setInternational, totals, packingPlan }) {
  return <><section className="shipping page-view"><div className="section-head"><div><p className="eyebrow">Pre-checkout logistics</p><h2>Shipping calculated from the cart</h2></div><div className="shipping-controls"><label>ZIP or pincode<input value={zip} onChange={(event) => setZip(event.target.value)} inputMode="numeric" /></label><label className="toggle"><input checked={international} onChange={(event) => setInternational(event.target.checked)} type="checkbox" />International</label></div></div><div className="logistics-grid"><Metric label="Actual weight" value={`${totals.actualWeight.toFixed(2)} lb`} /><Metric label="DIM weight" value={`${totals.dimensionalWeight.toFixed(2)} lb`} /><Metric label="Shipping zone" value={`Zone ${totals.zone}`} /><Metric label="Duties estimate" value={money.format(totals.duties)} /></div></section><section className="fulfillment page-view" aria-label="Fulfillment intelligence"><div><p className="eyebrow">From the reference PDF</p><h2>Package intelligence before checkout</h2><p>Aurum models master carton data, dimensional weight, destination zones, and landed-cost placeholders before the buyer reaches payment.</p></div><div className="packing-card"><span>Recommended carton</span><strong>{packingPlan.box}</strong><small>{packingPlan.risk} · {packingPlan.voidFill} void fill</small></div><div className="provider-grid"><Provider name="Dutify" text="API-first duties, tax, and compliance placeholder." /><Provider name="Easyship" text="Multi-carrier rates and customs paperwork placeholder." /><Provider name="Stripe Tax" text="Localized tax calculation placeholder for checkout." /><Provider name="Carrier engine" text={packingPlan.carrier} /></div></section><section className="seo-panel flow-bridge" aria-label="Cross-border SEO readiness"><div><span>hreflang ready</span><strong>Regional search growth</strong></div><p>Product pages can later serve localized content for US, UK, EU, India, and Asia search engines while preserving a single premium catalog experience.</p></section></>
}

function CheckoutView({ cartCount, cartItems, changeQuantity, totals, beginCheckout }) {
  return <section className="checkout page-view"><div className="cart-panel"><div className="section-head compact"><div><p className="eyebrow">Secure checkout</p><h2>Your cart</h2></div><span className="cart-count">{cartCount}</span></div>{cartItems.length === 0 ? <p className="empty-cart">Add items to preview shipping and totals.</p> : <CartItems items={cartItems} changeQuantity={changeQuantity} />}</div><OrderSummary totals={totals} beginCheckout={beginCheckout} disabled={!cartItems.length} /></section>
}

function CartDrawer({ cartCount, cartItems, changeQuantity, totals, beginCheckout, close }) {
  return <div className="drawer-shell" role="dialog" aria-modal="true" aria-label="Shopping cart"><button className="drawer-backdrop" onClick={close} type="button" aria-label="Close cart" /><aside className="cart-drawer"><div className="drawer-head"><div><p className="eyebrow">Vault cart</p><h2>{cartCount} item{cartCount === 1 ? '' : 's'}</h2></div><button onClick={close} type="button">Close</button></div>{cartItems.length === 0 ? <p className="empty-cart">Your cart is ready for rare finds.</p> : <CartItems items={cartItems} changeQuantity={changeQuantity} />}<OrderSummary totals={totals} beginCheckout={beginCheckout} disabled={!cartItems.length} compact /></aside></div>
}

function CheckoutModal({ checkoutStep, setCheckoutStep, user, openAuth, totals, orderStatus, placeOrder, close }) {
  return <div className="checkout-modal" role="dialog" aria-modal="true" aria-label="Checkout"><div className="checkout-card"><button className="modal-close" onClick={close} type="button">Close</button><p className="eyebrow">Private checkout</p><h2>Complete your reservation</h2><div className="steps"><button className={checkoutStep === 1 ? 'active' : ''} onClick={() => setCheckoutStep(1)} type="button">1 Account</button><button className={checkoutStep === 2 ? 'active' : ''} onClick={() => setCheckoutStep(2)} type="button">2 Delivery</button><button className={checkoutStep === 3 ? 'active' : ''} onClick={() => setCheckoutStep(3)} type="button">3 Review</button></div>{checkoutStep === 1 && <AccountStep user={user} openAuth={openAuth} />}{checkoutStep === 2 && <CheckoutFields labels={['Street address', 'City', 'Country']} />}{checkoutStep === 3 && <div className="review-box"><strong>{money.format(totals.grandTotal)}</strong><span>{firebaseReady ? 'Reservation will save to Firestore.' : 'Add Firebase env values before saving live orders.'}</span>{orderStatus && <em>{orderStatus}</em>}</div>}<div className="modal-actions"><button onClick={() => setCheckoutStep((step) => Math.max(1, step - 1))} type="button">Back</button><button onClick={() => checkoutStep === 3 ? placeOrder() : setCheckoutStep((step) => step + 1)} type="button">{checkoutStep === 3 ? 'Place demo order' : 'Continue'}</button></div></div></div>
}

function AuthModal({ authMode, setAuthMode, authRole, setAuthRole, authForm, setAuthForm, authError, handleAuthSubmit, handleGoogleSignIn, close }) {
  const roleCopy = authRole === 'consignor'
    ? { title: 'Consignor desk', text: 'For approved partners listing gold, coins, antiques, provenance files, and fulfillment details.' }
    : { title: 'Collector account', text: 'For buyers reserving assets, saving carts, and tracking insured checkout reservations.' }
  return <div className="checkout-modal" role="dialog" aria-modal="true" aria-label="Account sign in"><form className="checkout-card auth-card" onSubmit={handleAuthSubmit}><button className="modal-close" onClick={close} type="button">Close</button><p className="eyebrow">Choose account type</p><h2>{authMode === 'create' ? `Create ${roleLabels[authRole]} account` : `Sign in as ${roleLabels[authRole]}`}</h2><p className="firebase-note">{roleCopy.text} {firebaseReady ? 'Firebase Auth will lock this email to the selected role.' : 'Add Firebase env values to .env.local and Vercel before live sign-in works.'}</p><div className="role-switch" role="tablist" aria-label="Account type"><button className={authRole === 'collector' ? 'active' : ''} onClick={() => setAuthRole('collector')} type="button"><span>Collector</span><small>Buy and reserve</small></button><button className={authRole === 'consignor' ? 'active' : ''} onClick={() => setAuthRole('consignor')} type="button"><span>Consignor</span><small>List inventory</small></button></div><div className="role-context"><strong>{roleCopy.title}</strong><span>{authMode === 'create' ? 'Registration permanently assigns this role to the account.' : 'Use the same role you selected during registration.'}</span></div><div className="checkout-fields auth-fields"><label>Email<input value={authForm.email} onChange={(event) => setAuthForm((form) => ({ ...form, email: event.target.value }))} placeholder="you@example.com" type="email" /></label><label>Password<input value={authForm.password} onChange={(event) => setAuthForm((form) => ({ ...form, password: event.target.value }))} placeholder="At least 6 characters" type="password" /></label></div>{authError && <p className="auth-error">{authError}</p>}<div className="modal-actions auth-actions"><button onClick={() => setAuthMode((mode) => mode === 'create' ? 'sign-in' : 'create')} type="button">{authMode === 'create' ? 'Use sign in' : 'Create account'}</button><button type="submit">{authMode === 'create' ? `Create ${roleLabels[authRole]}` : `Sign in as ${roleLabels[authRole]}`}</button></div><button className="google-button" onClick={handleGoogleSignIn} type="button">Continue with Google as {roleLabels[authRole]}</button></form></div>
}

function DashboardView({ user, profile, changePage, openAuth }) {
  if (!user) return <section className="dashboard page-view"><div className="dashboard-hero"><p className="eyebrow">Private access</p><h2>Choose an account role to continue</h2><p>Collectors and consignors use separate dashboards so buying activity and listing tools stay cleanly separated.</p><button className="button primary" onClick={openAuth} type="button">Sign in or register</button></div></section>
  const role = profile?.role || 'collector'
  return <section className="dashboard page-view"><div className="dashboard-hero"><p className="eyebrow">{roleLabels[role]} dashboard</p><h2>{role === 'consignor' ? 'Manage listings for review' : 'Your private collection desk'}</h2><p>{user.email} is signed in as {roleLabels[role]}. This role is locked to the account profile.</p></div>{role === 'consignor' ? <ConsignorDashboard /> : <CollectorDashboard changePage={changePage} />}</section>
}

function CollectorDashboard({ changePage }) {
  return <div className="dashboard-grid"><article><span>Saved reservations</span><strong>0 active</strong><p>Reserved assets and Firestore order history will appear here.</p></article><article><span>Vault preferences</span><strong>Insured delivery</strong><p>Collectors can review checkout, duties, and dimensional shipping estimates.</p></article><article><span>Next step</span><strong>Browse collection</strong><p>Continue shopping authenticated gold, rare coins, and antiques.</p><button onClick={() => changePage('collection')} type="button">Open collection</button></article></div>
}

function ConsignorDashboard() {
  return <><div className="dashboard-grid"><article><span>Listing queue</span><strong>3 draft slots</strong><p>Create product drafts with origin, condition, dimensions, imagery, and provenance files.</p></article><article><span>Review status</span><strong>Authentication pending</strong><p>Listings stay private until Aurum review approves them for the marketplace.</p></article><article><span>Fulfillment profile</span><strong>Vault handoff</strong><p>Consignors can define packing needs, insurance value, and dispatch notes.</p></article></div><div className="listing-form"><p className="eyebrow">Draft a listing placeholder</p><div className="checkout-fields"><label>Object name<input placeholder="Swiss bar, Roman coin, estate bracelet" /></label><label>Category<input placeholder="Gold, Coins, Antiques" /></label><label>Estimated value<input placeholder="$2,400" /></label></div><button type="button">Save draft preview</button></div></>
}

function CartItems({ items, changeQuantity }) {
  return <div className="cart-items">{items.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{money.format(item.price)} · {item.condition}</span></div><div className="quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`} type="button">-</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`} type="button">+</button></div></div>)}</div>
}

function OrderSummary({ totals, beginCheckout, disabled, compact = false }) {
  return <aside className={compact ? 'summary-panel compact-summary' : 'summary-panel'} aria-label="Order summary"><h2>Order summary</h2><SummaryRow label="Merchandise" value={money.format(totals.subtotal)} /><SummaryRow label="Insured shipping" value={money.format(totals.shipping)} /><SummaryRow label="Insurance" value={money.format(totals.insurance)} /><SummaryRow label="Import duties" value={money.format(totals.duties)} /><SummaryRow label="Billable weight" value={`${totals.billableWeight.toFixed(2)} lb`} /><div className="grand-total"><span>Total</span><strong>{money.format(totals.grandTotal)}</strong></div><button className="checkout-button" disabled={disabled} onClick={beginCheckout} type="button">Continue securely</button></aside>
}

function AccountStep({ user, openAuth }) {
  if (user) return <div className="review-box"><strong>{user.email}</strong><span>Signed in and ready for saved reservations.</span></div>
  return <div className="review-box"><strong>Sign in recommended</strong><span>Create an account to save reservations and order history in Firestore.</span><button onClick={openAuth} type="button">Sign in or create account</button></div>
}

function CheckoutFields({ labels }) {
  return <div className="checkout-fields">{labels.map((label) => <label key={label}>{label}<input placeholder={label} /></label>)}</div>
}

function Metric({ label, value }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article> }
function Provider({ name, text }) { return <article className="provider"><strong>{name}</strong><span>{text}</span></article> }
function SummaryRow({ label, value }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div> }
export default App
