import { useState, useEffect } from 'react'
import { X, Settings, DollarSign, Tag, Truck, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import api from '../services/api'

// Fallback categories when API fails or not connected
const FALLBACK_CATEGORIES = [
  { id: 2078, name: 'Digital Downloads > Graphics > Mockups' },
  { id: 2079, name: 'Digital Downloads > Graphics > Clipart' },
  { id: 2080, name: 'Digital Downloads > Templates' },
  { id: 1, name: 'Craft Supplies & Tools > Patterns & How To' },
  { id: 2, name: 'Art & Collectibles > Prints > Digital Prints' }
]

// Fallback shipping profiles when API fails or not connected
const FALLBACK_SHIPPING_PROFILES = [
  { shipping_profile_id: 'digital', title: 'Digital nedladdning (ingen frakt)' },
  { shipping_profile_id: 'standard', title: 'Standardfrakt Sverige' },
  { shipping_profile_id: 'international', title: 'Internationell frakt' }
]

// Fallback return policies
const FALLBACK_RETURN_POLICIES = [
  { return_policy_id: 'no_returns', label: 'Inga returer (digitala produkter)' },
  { return_policy_id: '14_days', label: '14 dagars returrätt' },
  { return_policy_id: '30_days', label: '30 dagars returrätt' }
]

function PreProcessModal({ isOpen, onClose, onConfirm, productCount }) {
  const [settings, setSettings] = useState({
    defaultPrice: '',
    category: '',
    categoryId: null,
    shippingProfile: '',
    shippingProfileId: null,
    shippingCost: '',
    shippingTime: '',
    returnPolicy: '',
    returnPolicyId: null,
    quantity: 1,
    materials: '',
    autoPublish: false,
    saveAsTemplate: false,
    templateName: ''
  })
  
  // State for fetched Etsy data
  const [shippingProfiles, setShippingProfiles] = useState([])
  const [categories, setCategories] = useState([])
  const [returnPolicies, setReturnPolicies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [etsyConnected, setEtsyConnected] = useState(false)
  const [loadError, setLoadError] = useState(null)
  
  // Fetch Etsy data when modal opens
  useEffect(() => {
    if (!isOpen) return
    
    const fetchEtsyData = async () => {
      setIsLoading(true)
      setLoadError(null)
      
      try {
        // Check Etsy connection status first
        const status = await api.getEtsyStatus()
        setEtsyConnected(status.connected)
        
        if (status.connected) {
          // Fetch real data from Etsy in parallel
          const [profilesData, categoriesData, policiesData] = await Promise.all([
            api.getShippingProfiles().catch(() => []),
            api.getCategories().catch(() => []),
            api.getReturnPolicies().catch(() => [])
          ])
          
          // Set shipping profiles (use real data or fallback)
          const profiles = profilesData.length > 0 ? profilesData : FALLBACK_SHIPPING_PROFILES
          setShippingProfiles(profiles)
          
          // Set categories (flatten taxonomy if needed)
          const cats = categoriesData.length > 0 ? flattenCategories(categoriesData) : FALLBACK_CATEGORIES
          setCategories(cats)
          
          // Set return policies
          const policies = policiesData.length > 0 ? policiesData : FALLBACK_RETURN_POLICIES
          setReturnPolicies(policies)
          
          // Set default values
          setSettings(s => ({
            ...s,
            shippingProfile: profiles[0]?.title || profiles[0]?.shipping_profile_id || 'digital',
            shippingProfileId: profiles[0]?.shipping_profile_id || null,
            category: cats[0]?.name || 'Digital Downloads',
            categoryId: cats[0]?.id || 2078,
            returnPolicy: policies[0]?.label || policies[0]?.return_policy_id || 'no_returns',
            returnPolicyId: policies[0]?.return_policy_id || null
          }))
        } else {
          // Use fallbacks when not connected
          setShippingProfiles(FALLBACK_SHIPPING_PROFILES)
          setCategories(FALLBACK_CATEGORIES)
          setReturnPolicies(FALLBACK_RETURN_POLICIES)
          setSettings(s => ({
            ...s,
            shippingProfile: FALLBACK_SHIPPING_PROFILES[0].title,
            shippingProfileId: FALLBACK_SHIPPING_PROFILES[0].shipping_profile_id,
            category: FALLBACK_CATEGORIES[0].name,
            categoryId: FALLBACK_CATEGORIES[0].id,
            returnPolicy: FALLBACK_RETURN_POLICIES[0].label,
            returnPolicyId: FALLBACK_RETURN_POLICIES[0].return_policy_id
          }))
        }
      } catch (err) {
        console.error('Failed to fetch Etsy data:', err)
        setLoadError('Kunde inte hämta data från Etsy. Använder standardvärden.')
        // Use fallbacks on error
        setShippingProfiles(FALLBACK_SHIPPING_PROFILES)
        setCategories(FALLBACK_CATEGORIES)
        setReturnPolicies(FALLBACK_RETURN_POLICIES)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchEtsyData()
  }, [isOpen])
  
  // Helper to flatten nested category taxonomy
  const flattenCategories = (nodes, prefix = '', result = []) => {
    for (const node of nodes) {
      const name = prefix ? `${prefix} > ${node.name}` : node.name
      result.push({ id: node.id, name })
      if (node.children && node.children.length > 0) {
        flattenCategories(node.children, name, result)
      }
    }
    return result.slice(0, 50) // Limit to 50 for performance
  }
  
  if (!isOpen) return null
  
  const handleConfirm = () => {
    onConfirm(settings)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-etsy-light rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-etsy-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Standardinställningar</h2>
              <p className="text-sm text-gray-500">{productCount} produkter kommer att bearbetas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-etsy-orange animate-spin" />
              <span className="ml-2 text-gray-600">Hämtar data från Etsy...</span>
            </div>
          )}
          
          {/* Error/Warning Banner */}
          {loadError && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">{loadError}</span>
            </div>
          )}
          
          {/* Etsy Connection Status */}
          {!isLoading && !etsyConnected && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">
                Etsy ej ansluten. Anslut på inställningssidan för att hämta dina profiler.
              </span>
            </div>
          )}
          
          {/* Quantity */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              Antal i lager
            </label>
            <input
              type="number"
              min="1"
              value={settings.quantity}
              onChange={(e) => setSettings(s => ({ ...s, quantity: e.target.value }))}
              placeholder="T.Ex. 10"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Hur många exemplar som finns tillgängliga för försäljning</p>
          </div>

          {/* Materials */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              Material
            </label>
            <input
              type="text"
              value={settings.materials}
              onChange={(e) => setSettings(s => ({ ...s, materials: e.target.value }))}
              placeholder="T.ex. bomull, polyester, trä"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Ange material, separerade med kommatecken</p>
          </div>

          {/* Expanded Shipping Options */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              Mer detaljerad frakt (valfritt)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min="0"
                value={settings.shippingCost}
                onChange={(e) => setSettings(s => ({ ...s, shippingCost: e.target.value }))}
                placeholder="Fraktkostnad (SEK)"
                className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
              />
              <input
                type="text"
                value={settings.shippingTime}
                onChange={(e) => setSettings(s => ({ ...s, shippingTime: e.target.value }))}
                placeholder="Leveranstid (t.ex. 1-3 dagar)"
                className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400">Lämna tomt för att använda standardprofil</p>
          </div>
          
          {/* Default Price */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4" />
              Standardpris (SEK)
            </label>
            <input
              type="number"
              value={settings.defaultPrice}
              onChange={(e) => setSettings(s => ({ ...s, defaultPrice: e.target.value }))}
              placeholder="T.ex. 49"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Lämna tomt för att ställa in per produkt</p>
          </div>
          
          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              Kategori
              {etsyConnected && <span className="text-xs text-green-600">(från Etsy)</span>}
            </label>
            <select
              value={settings.category}
              onChange={(e) => {
                const selected = categories.find(c => c.name === e.target.value)
                setSettings(s => ({ 
                  ...s, 
                  category: e.target.value,
                  categoryId: selected?.id || null
                }))
              }}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent disabled:bg-gray-100"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          {/* Shipping Profile */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Truck className="w-4 h-4" />
              Fraktprofil
              {etsyConnected && shippingProfiles.length > 0 && shippingProfiles[0].shipping_profile_id !== 'digital' && (
                <span className="text-xs text-green-600">(från din Etsy-butik)</span>
              )}
            </label>
            <select
              value={settings.shippingProfile}
              onChange={(e) => {
                const selected = shippingProfiles.find(p => (p.title || p.shipping_profile_id) === e.target.value)
                setSettings(s => ({ 
                  ...s, 
                  shippingProfile: e.target.value,
                  shippingProfileId: selected?.shipping_profile_id || null
                }))
              }}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent disabled:bg-gray-100"
            >
              {shippingProfiles.map(profile => (
                <option key={profile.shipping_profile_id} value={profile.title || profile.shipping_profile_id}>
                  {profile.title || profile.shipping_profile_id}
                </option>
              ))}
            </select>
          </div>
          
          {/* Return Policy */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <RotateCcw className="w-4 h-4" />
              Returpolicy
              {etsyConnected && returnPolicies.length > 0 && returnPolicies[0].return_policy_id !== 'no_returns' && (
                <span className="text-xs text-green-600">(från din Etsy-butik)</span>
              )}
            </label>
            <select
              value={settings.returnPolicy}
              onChange={(e) => {
                const selected = returnPolicies.find(p => (p.label || p.return_policy_id) === e.target.value)
                setSettings(s => ({ 
                  ...s, 
                  returnPolicy: e.target.value,
                  returnPolicyId: selected?.return_policy_id || null
                }))
              }}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent disabled:bg-gray-100"
            >
              {returnPolicies.map(policy => (
                <option key={policy.return_policy_id} value={policy.label || policy.return_policy_id}>
                  {policy.label || policy.return_policy_id}
                </option>
              ))}
            </select>
          </div>
          
          {/* Save as Template */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveAsTemplate}
                onChange={(e) => setSettings(s => ({ ...s, saveAsTemplate: e.target.checked }))}
                className="w-5 h-5 text-etsy-orange rounded focus:ring-etsy-orange"
              />
              <span className="text-sm font-medium text-gray-700">Spara som mall för framtida uppladdningar</span>
            </label>
            
            {settings.saveAsTemplate && (
              <input
                type="text"
                value={settings.templateName}
                onChange={(e) => setSettings(s => ({ ...s, templateName: e.target.value }))}
                placeholder="Mallnamn, t.ex. 'Mockup Standard'"
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-etsy-orange focus:border-transparent"
              />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Hoppa över
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-etsy-orange text-white rounded-lg font-medium hover:bg-etsy-orange-dark transition-colors"
          >
            Tillämpa & Fortsätt
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreProcessModal
