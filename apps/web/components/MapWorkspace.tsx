"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Marker, type LngLatBoundsLike, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Minus,
  Compass,
  Loader2,
  AlertTriangle,
  Briefcase,
  MapPin,
  X,
  Building2,
  TrendingUp,
  ChevronRight,
  Rocket,
  Landmark,
  Sprout,
  CircleDollarSign,
  Building,
  Factory,
  Blocks,
  MapPinned,
  Filter,
  BriefcaseBusiness,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  searchCompaniesInBoundingBox,
  searchJobs,
  getJobSuggestions,
  getSectors,
  getCities,
  getStages,
  getAreas,
  getTypes,
  type BoundingBox,
  type Company,
} from "@/lib/api";
import { useMapSelectionStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Sector → visual config
// ---------------------------------------------------------------------------

const SECTOR_CONFIG: Record<string, { color: string; emoji: string }> = {
  AI: { color: "#3B82F6", emoji: "🤖" },
  SaaS: { color: "#10B981", emoji: "☁️" },
  Fintech: { color: "#F97316", emoji: "💳" },
  Consumer: { color: "#EC4899", emoji: "🛍️" },
  Healthtech: { color: "#EF4444", emoji: "🏥" },
  Edtech: { color: "#EAB308", emoji: "📚" },
  "Cloud/Infra": { color: "#06B6D4", emoji: "🌐" },
  Mobile: { color: "#8B5CF6", emoji: "📱" },
  Deeptech: { color: "#6366F1", emoji: "🔬" },
  Other: { color: "#6B7280", emoji: "🏢" },
};

const DEFAULT_SECTOR = { color: "#6B7280", emoji: "🏢" };
function getSectorConfig(sector: string | null) {
  const key = sector || "Other";
  return (SECTOR_CONFIG as Record<string, { color: string; emoji: string }>)[key] ?? DEFAULT_SECTOR;
}

function getInitials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// City config
// ---------------------------------------------------------------------------

interface CityConfig {
  longitude: number;
  latitude: number;
  zoom: number;
}

const CITY_CENTERS: Record<string, CityConfig> = {
  Bengaluru: { longitude: 77.665, latitude: 12.935, zoom: 11 },
  Chennai: { longitude: 80.255, latitude: 12.98, zoom: 11 },
  Hyderabad: { longitude: 78.4867, latitude: 17.385, zoom: 11 },
  Kochi: { longitude: 76.267, latitude: 9.9312, zoom: 12 },
  Coimbatore: { longitude: 76.97, latitude: 11.01, zoom: 12 },
  Thiruvananthapuram: { longitude: 76.9366, latitude: 8.5241, zoom: 12 },
  Madurai: { longitude: 78.1198, latitude: 9.9252, zoom: 13 },
  Kozhikode: { longitude: 75.7873, latitude: 11.2588, zoom: 13 },
};

function getCityCenter(city: string): CityConfig {
  return (CITY_CENTERS as Record<string, CityConfig>)[city] ?? CITY_CENTERS["Bengaluru"]!;
}

const MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ---------------------------------------------------------------------------
// Company Pin — the fancy avatar with logo, hiring glow, and rich tooltip
// ---------------------------------------------------------------------------

const CompanyPin = React.memo(function CompanyPin({
  company,
  isSelected,
  isHovered,
  zoom,
  onClick,
  onHover,
  onLeave,
}: {
  company: Company;
  isSelected: boolean;
  isHovered: boolean;
  zoom: number;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const isHiring = company.active_job_count > 0;
  const sector = getSectorConfig(company.sector) ?? DEFAULT_SECTOR;

  // Resolve logo URL via local proxy (computed once)
  const logoUrl = useMemo(() => {
    const websiteDomain = company.website_url
      ? (() => {
          try { return new URL(company.website_url).hostname; }
          catch {
            // Handle bare domains like 'razorpay.com'
            const url = company.website_url.replace(/^[/]+/, '').split(/[/s?#]/)[0];
            return url && url.includes('.') ? url : null;
          }
        })()
      : null;
    const domain =
      websiteDomain ||
      (company.logo_url?.includes("domain=")
        ? (() => { try { return new URL(company.logo_url!).searchParams.get("domain"); } catch { return null; } })()
        : null);
    return domain ? `/api/logo?domain=${domain}` : null;
  }, [company.website_url, company.logo_url]);

  // Dynamic sizing based on zoom level (snapped to avoid micro-jitter)
  const PIN_SIZE = useMemo(() => {
    const zoomScale = Math.min(Math.max((zoom - 10) / 4, 0), 1);
    const baseSize = 32 + zoomScale * 20;
    return isSelected ? baseSize + 16 : isHovered ? baseSize + 8 : baseSize;
  }, [zoom, isSelected, isHovered]);

  return (
    <div
      className="flex flex-col items-center"
      style={{
        zIndex: isSelected ? 200 : isHovered ? 100 : 10,
        cursor: "pointer",
        filter: isSelected
          ? "drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
          : "drop-shadow(0 2px 6px rgba(0,0,0,0.15))",
      }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* ── Floating name pill (selected) ── */}
      {isSelected && (
        <div
          className="mb-2 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white z-50"
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {isHiring && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[8px]">
              <Briefcase className="h-2.5 w-2.5 text-white" />
            </span>
          )}
          {company.name}
          {isHiring && <span className="text-green-400">· {company.active_job_count} open</span>}
        </div>
      )}

      {/* ── Main avatar ── */}
      <div className="relative">
        {/* Hiring: animated pulse ring */}
        {isHiring && (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid #22c55e",
                animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite",
                opacity: 0.4,
                margin: "-6px",
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid #22c55e",
                animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite 0.6s",
                opacity: 0.25,
                margin: "-6px",
              }}
            />
          </>
        )}

        {/* Outer ring */}
        <div
          className="rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: PIN_SIZE,
            height: PIN_SIZE,
            padding: 3,
            background: isHiring
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              : `linear-gradient(135deg, ${sector.color}66 0%, ${sector.color}33 100%)`,
            boxShadow: isHiring
              ? "0 0 0 2px rgba(34,197,94,0.3), 0 4px 12px rgba(34,197,94,0.2)"
              : `0 0 0 1px ${sector.color}22, 0 2px 8px rgba(0,0,0,0.1)`,
            transform: isSelected ? "scale(1.2)" : isHovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          {/* Inner white circle with logo */}
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-white overflow-hidden"
            style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)" }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company.name}
                className="h-[72%] w-[72%] object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  // Hide the broken image, CSS fallback shows initials
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const span = parent.querySelector(".logo-fallback");
                    if (span) (span as HTMLElement).style.display = "flex";
                  }
                }}
                draggable={false}
              />
            ) : null}
            {/* Logo fallback — always rendered but hidden when logo loads */}
            <span
              className="logo-fallback font-extrabold leading-none select-none"
              style={{
                fontSize: PIN_SIZE * 0.28,
                color: sector.color,
                display: logoUrl ? "none" : "flex",
                position: logoUrl ? "absolute" : "relative",
              }}
            >
              {getInitials(company.name)}
            </span>
          </div>
        </div>

        {/* Hiring badge */}
        {isHiring && (
          <div
            className="absolute flex items-center justify-center rounded-full bg-green-500 text-white shadow-md"
            style={{ width: 20, height: 20, bottom: -2, right: -4, border: "2.5px solid white" }}
          >
            <Briefcase className="h-2.5 w-2.5" />
          </div>
        )}

        {/* Non-hiring dot */}
        {!isHiring && (
          <div
            className="absolute rounded-full bg-gray-300"
            style={{ width: 10, height: 10, bottom: 0, right: 0, border: "2px solid white" }}
          />
        )}
      </div>

      {/* ── Hover tooltip ── */}
      {isHovered && !isSelected && (
        <div
          className="absolute whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs shadow-xl z-50"
          style={{
            top: PIN_SIZE + 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3" style={{ color: sector.color }} />
            <span className="font-bold text-gray-900">{company.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: sector.color }} />
            <span>{company.sector || "Other"}</span>
            {company.area && (
              <>
                <span className="text-gray-300">·</span>
                <span>{company.area}</span>
              </>
            )}
          </div>
          {isHiring ? (
            <div className="mt-1.5 flex items-center gap-1 text-green-600 font-semibold">
              <TrendingUp className="h-3 w-3" />
              {company.active_job_count} open roles
            </div>
          ) : (
            <div className="mt-1.5 text-gray-400">Not hiring right now</div>
          )}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// City-level pin — premium location marker with count badge
const CityPin = React.memo(function CityPin({
  cityName, count, hiringCount, isSelected, isHovered, onClick, onHover, onLeave,
}: {
  cityName: string; count: number; hiringCount: number;
  isSelected: boolean; isHovered: boolean;
  onClick: () => void; onHover: () => void; onLeave: () => void;
}) {
  const hasHiring = hiringCount > 0;
  const isActive = isSelected || isHovered;

  return (
    <div
      className="flex flex-col items-center cursor-pointer"
      style={{
        zIndex: isActive ? 200 : 50,
        filter: isActive
          ? "drop-shadow(0 6px 24px rgba(22,163,74,0.45))"
          : "drop-shadow(0 3px 10px rgba(0,0,0,0.25))",
        transition: "filter 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        transform: isActive ? "scale(1.1)" : "scale(1)",
      }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Location pin SVG */}
      <div className="relative">
        {/* Animated ring for hiring */}
        {hasHiring && !isActive && (
          <div className="absolute" style={{
            top: -6, left: -6, width: 60, height: 60,
            borderRadius: "50%",
            border: "2px solid #22c55e",
            animation: "ping 2.5s cubic-bezier(0,0,0.2,1) infinite",
            opacity: 0.3,
          }} />
        )}

        <svg
          width={isActive ? 52 : 44}
          height={isActive ? 64 : 56}
          viewBox="0 0 44 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          {/* Pin shadow */}
          <ellipse cx="22" cy="52" rx="10" ry="3" fill="rgba(0,0,0,0.12)" />
          
          {/* Pin body */}
          <path
            d="M22 2C13.16 2 6 9.16 6 18c0 12 16 32 16 32s16-20 16-32C38 9.16 30.84 2 22 2z"
            fill={hasHiring ? "url(#pinGreen)" : "url(#pinDark)"}
            stroke={isActive ? "#ffffff" : "rgba(255,255,255,0.3)"}
            strokeWidth={isActive ? 2 : 1}
          />
          
          {/* Inner circle (count area) */}
          <circle cx="22" cy="18" r="13" fill="white" opacity="0.95" />
          
          {/* Count text */}
          <text
            x="22"
            y="19"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={count > 99 ? "11" : "13"}
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={hasHiring ? "#16a34a" : "#1e293b"}
          >
            {count}
          </text>

          {/* Gradient defs */}
          <defs>
            <linearGradient id="pinGreen" x1="22" y1="2" x2="22" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22c55e" />
              <stop offset="0.5" stopColor="#16a34a" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="pinDark" x1="22" y1="2" x2="22" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#475569" />
              <stop offset="0.5" stopColor="#334155" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hiring count badge */}
        {hasHiring && (
          <div
            className="absolute flex items-center justify-center rounded-full bg-green-500 text-white font-bold"
            style={{
              width: 20, height: 20,
              top: -2, right: -8,
              fontSize: 9,
              border: "2px solid white",
              boxShadow: "0 2px 6px rgba(34,197,94,0.4)",
            }}
          >
            {hiringCount}
          </div>
        )}
      </div>

      {/* Floating name pill */}
      <div
        className="mt-0.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold shadow-lg"
        style={{
          background: isActive
            ? "linear-gradient(135deg, #16a34a 0%, #059669 100%)"
            : "rgba(255,255,255,0.95)",
          color: isActive ? "white" : "#1f2937",
          backdropFilter: "blur(8px)",
          border: isActive ? "none" : "1px solid rgba(0,0,0,0.06)",
          transition: "all 0.3s ease",
        }}
      >
        {cityName}
      </div>
    </div>
  );
});

// --- Main Component
export function MapWorkspace() {
  const mapRef = useRef<MapRef>(null);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [hiringOnly, setHiringOnly] = useState(false);
  const isFirstRender = useRef(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(6);

  const selectedCompanyId = useMapSelectionStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useMapSelectionStore((s) => s.setSelectedCompanyId);

  const { data: sectors } = useQuery({ queryKey: ["sectors"], queryFn: getSectors });
  const { data: cities } = useQuery({ queryKey: ["cities"], queryFn: getCities });
  const { data: stages } = useQuery({ queryKey: ["stages"], queryFn: getStages });
  const { data: areas } = useQuery({ queryKey: ["areas", selectedCity], queryFn: () => getAreas(selectedCity) });
  const { data: types } = useQuery({ queryKey: ["types", selectedCity], queryFn: () => getTypes(selectedCity) });

  const updateBoundsFromMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    setBbox({
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    });
    setZoom(map.getZoom());
  }, []);

  useEffect(() => {
    const center = getCityCenter(selectedCity);
    setBbox((prev) => {
      if (prev) return prev;
      const d = 0.2;
      return {
        minLat: center.latitude - d,
        minLng: center.longitude - d,
        maxLat: center.latitude + d,
        maxLng: center.longitude + d,
      };
    });
    if (mapRef.current) { updateBoundsFromMap(); return; }
    const id = setInterval(() => { if (mapRef.current) { updateBoundsFromMap(); clearInterval(id); } }, 100);
    return () => clearInterval(id);
  }, [selectedCity, updateBoundsFromMap]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const c = getCityCenter(selectedCity);
    mapRef.current?.flyTo({ center: [c.longitude, c.latitude], zoom: c.zoom, duration: 800 });
  }, [selectedCity]);

  const { data: companies, isLoading, isError } = useQuery({
    queryKey: ["companies", "search", bbox, selectedSector, selectedCity, hiringOnly, selectedStage, selectedArea, selectedType],
    queryFn: () =>
      searchCompaniesInBoundingBox(bbox as BoundingBox, {
        sector: selectedSector || undefined,
        city: selectedCity || undefined,
        hiring_only: hiringOnly || undefined,
        stage: selectedStage || undefined,
        area: selectedArea || undefined,
        company_type: selectedType || undefined,
      }),
    enabled: bbox !== null,
    placeholderData: keepPreviousData,
  });

  // Job search query
  const { data: jobSearchResults } = useQuery({
    queryKey: ["jobSearch", searchQuery, selectedCity],
    queryFn: () => searchJobs(searchQuery, selectedCity),
    enabled: searchQuery.length >= 2,
  });

  // Autocomplete suggestions
  const { data: suggestions } = useQuery({
    queryKey: ["jobSuggestions", searchValue, selectedCity],
    queryFn: () => getJobSuggestions(searchValue, selectedCity),
    enabled: searchValue.length >= 2 && !searchQuery,
  });

  // Debounced search trigger
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchInput = (val: string) => {
    setSearchValue(val);
    setShowSuggestions(val.length >= 2);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => setSearchQuery(val), 400);
    } else {
      setSearchQuery("");
    }
  };

  const selectSuggestion = (title: string) => {
    setSearchValue(title);
    setSearchQuery(title);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close city dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-city-dropdown]')) setCityDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Get company IDs that match job search
  const jobSearchCompanyIds = useMemo(() => {
    if (!jobSearchResults || !searchQuery) return null;
    return new Set(jobSearchResults.map((r) => r.company_id));
  }, [jobSearchResults, searchQuery]);

  // Filter companies — show all when no search, only matching when searching
  const filteredCompanies = useMemo(() => {
    if (!companies) return undefined;
    if (!searchQuery || !jobSearchCompanyIds) return companies;
    return companies.filter((c) => jobSearchCompanyIds.has(c.id));
  }, [companies, searchQuery, jobSearchCompanyIds]);

  // No clustering — render all pins directly

  const hiringCount = filteredCompanies?.filter((c) => c.active_job_count > 0).length ?? 0;
  const totalCount = filteredCompanies?.length ?? 0;
  // City-level data for overview mode (zoomed out)
  const isOverviewMode = zoom < 8;
  const { data: allCities } = useQuery({ queryKey: ["cities"], queryFn: getCities });
  const showCityPins = !filteredCompanies || filteredCompanies.length === 0 || isOverviewMode;
  const cityHiringCounts = useMemo(() => {
    if (!filteredCompanies) return {};
    const map: Record<string, number> = {};
    for (const c of filteredCompanies) {
      if (c.active_job_count > 0 && c.city) map[c.city] = (map[c.city] || 0) + 1;
    }
    return map;
  }, [filteredCompanies]);

  const initialCenter = getCityCenter("Bengaluru");

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── Global CSS ── */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pinBounceIn {
          0% { transform: scale(0) translateY(10px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
      `}</style>

      <Map
        ref={mapRef}
        reuseMaps
        initialViewState={{
          longitude: 78.0,
          latitude: 12.0,
          zoom: 6,
        }}
        mapStyle={MAP_STYLE_URL}
        onLoad={updateBoundsFromMap}
        onMoveEnd={updateBoundsFromMap}
        onZoom={() => { if (mapRef.current) setZoom(mapRef.current.getZoom()); }}
        onClick={() => setSelectedCompanyId(null)}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {/* City-level pins (zoomed out) */}
        {showCityPins && allCities?.map((cityInfo) => {
          const center = getCityCenter(cityInfo.city);
          return (
            <Marker
              key={`city-${cityInfo.city}`}
              longitude={center.longitude}
              latitude={center.latitude}
              anchor="center"
            >
              <CityPin
                cityName={cityInfo.city}
                count={cityInfo.count}
                hiringCount={cityHiringCounts[cityInfo.city] || 0}
                isSelected={selectedCity === cityInfo.city}
                isHovered={false}
                onClick={() => {
                  setSelectedCity(cityInfo.city);
                  mapRef.current?.flyTo({
                    center: [center.longitude, center.latitude],
                    zoom: center.zoom,
                    duration: 1200,
                  });
                }}
                onHover={() => {}}
                onLeave={() => {}}
              />
            </Marker>
          );
        })}

        {/* Company-level pins (zoomed in) */}
        {!showCityPins && filteredCompanies?.map((company) => (
          <Marker
            key={company.id}
            longitude={company.longitude}
            latitude={company.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedCompanyId(company.id);
            }}
          >
            <CompanyPin
              company={company}
              isSelected={company.id === selectedCompanyId}
              isHovered={company.id === hoveredId}
              zoom={zoom}
              onClick={() => setSelectedCompanyId(company.id)}
              onHover={() => setHoveredId(company.id)}
              onLeave={() => setHoveredId(null)}
            />
          </Marker>
        ))}
      </Map>

      {/* ── Top toolbar ── */}
      <div className="absolute left-4 right-4 top-4 flex items-center gap-2">
        {/* Search with autocomplete */}
        <div className="relative flex-1 max-w-sm" ref={searchRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400 z-10" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchValue.length >= 2 && setShowSuggestions(true)}
            placeholder="Search job roles — Frontend Engineer, Data Scientist..."
            className="h-10 rounded-xl border-green-100 bg-white pl-9 pr-9 text-sm shadow-lg focus:ring-2 focus:ring-green-400/30"
          />
          {searchValue && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s.title)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-green-50"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  <span className="text-gray-700">{s.title}</span>
                </button>
              ))}
              <div className="border-t border-gray-100 bg-gray-50/50 px-3.5 py-2">
                <span className="text-[10px] font-medium text-gray-400">Press Enter to search</span>
              </div>
            </div>
          )}

          {/* Job search results dropdown */}
          {searchQuery && jobSearchResults && jobSearchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
              <div className="sticky top-0 border-b border-gray-100 bg-green-50/50 px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">{jobSearchResults.length} companies hiring</span>
              </div>
              {jobSearchResults.map((r) => (
                <button
                  key={r.company_id}
                  onClick={() => {
                    setSelectedCompanyId(r.company_id);
                    if (r.latitude && r.longitude) {
                      mapRef.current?.flyTo({ center: [r.longitude, r.latitude], zoom: 13, duration: 600 });
                    }
                    setShowSuggestions(false);
                  }}
                  className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-green-50 border-b border-gray-50 last:border-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-[11px] font-bold text-green-700">
                    {getInitials(r.company_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{r.company_name}</span>
                      {r.sector && <span className="rounded bg-gray-100 px-1 py-0.5 text-[8px] font-bold text-gray-500 uppercase">{r.sector}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                      {r.area && <span>{r.area}</span>}
                      {r.area && r.city && <span>·</span>}
                      <span>{r.city}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.matching_jobs.slice(0, 3).map((j) => (
                        <span key={j.id} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700">
                          {j.title}
                          {j.source && <span className="text-[7px] text-green-500">via {j.source}</span>}
                        </span>
                      ))}
                      {r.matching_jobs.length > 3 && (
                        <span className="text-[9px] text-gray-400">+{r.matching_jobs.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                    {r.matching_jobs.length} role{r.matching_jobs.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && jobSearchResults && jobSearchResults.length === 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-gray-100 bg-white p-4 shadow-xl text-center">
              <p className="text-xs text-gray-400">No jobs found for "{searchQuery}"</p>
              <p className="mt-1 text-[10px] text-gray-300">Try a different role or skill</p>
            </div>
          )}
        </div>

        {/* City dropdown */}
        <div className="relative shrink-0" data-city-dropdown>
          <button
            type="button"
            onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-lg transition-all hover:shadow-xl"
          >
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="text-gray-800">{selectedCity}</span>
            {(() => {
              const cc = (cities ?? []).find(c => c.city === selectedCity);
              return cc ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{cc.count}</span>
              ) : null;
            })()}
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", cityDropdownOpen && "rotate-180")} />
          </button>
          {cityDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
              style={{ animation: "fadeSlideUp 0.15s ease-out" }}
            >
              <div className="border-b border-gray-50 px-4 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select City</span>
              </div>
              {(cities ?? []).map((c) => (
                <button
                  key={c.city}
                  type="button"
                  onClick={() => { setSelectedCity(c.city); setCityDropdownOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    selectedCity === c.city
                      ? "bg-green-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold",
                    selectedCity === c.city
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-[13px] font-semibold", selectedCity === c.city ? "text-green-700" : "text-gray-800")}>
                      {c.city}
                    </div>
                    <div className="text-[10px] text-gray-400">{c.count} companies</div>
                  </div>
                  {selectedCity === c.city && (
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hiring filter */}
        <button
          type="button"
          onClick={() => setHiringOnly(!hiringOnly)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shadow-lg transition-all duration-200",
            hiringOnly
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25"
              : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-700"
          )}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          {hiringOnly ? "Hiring" : "All"}
        </button>

        {/* Status */}
        {isLoading && (
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-500 shadow-lg">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-green-500" /> Loading…
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-500 shadow-lg">
            <AlertTriangle className="h-3.5 w-3.5" /> Error
          </div>
        )}
        {!isLoading && !isError && filteredCompanies && (
          <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold shadow-lg">
            {searchQuery && (
              <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                "{searchQuery}"
              </span>
            )}
            <Building2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-gray-700">{totalCount} compan{totalCount !== 1 ? 'ies' : 'y'}</span>
            {hiringCount > 0 && (
              <>
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {hiringCount} hiring
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Zoom controls ── */}
      <div className="absolute right-4 top-4 flex flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        <button
          className="flex h-9 w-9 items-center justify-center text-gray-400 transition hover:bg-green-50 hover:text-green-600"
          onClick={() => mapRef.current?.zoomIn({ duration: 200 })}
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mx-2.5 h-px bg-gray-100" />
        <button
          className="flex h-9 w-9 items-center justify-center text-gray-400 transition hover:bg-green-50 hover:text-green-600"
          onClick={() => mapRef.current?.zoomOut({ duration: 200 })}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="mx-2.5 h-px bg-gray-100" />
        <button
          className="flex h-9 w-9 items-center justify-center text-gray-400 transition hover:bg-green-50 hover:text-green-600"
          onClick={() => {
            const c = getCityCenter(selectedCity);
            mapRef.current?.flyTo({ center: [c.longitude, c.latitude], zoom: c.zoom, duration: 600 });
          }}
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>

      {/* ── Filter panel ── */}
      <div
        className="absolute left-4 top-20 w-52 max-h-[calc(100%-100px)] overflow-y-auto rounded-2xl bg-white shadow-xl"
        style={{ animation: "fadeSlideUp 0.3s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-green-50 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-100">
            <Filter className="h-3.5 w-3.5 text-green-600" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Filters</h3>
        </div>

        {/* Type */}
        <div className="px-3 pb-2 pt-3">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-green-500">Type</span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <button type="button" onClick={() => setSelectedType(null)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                selectedType === null ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-600 hover:bg-green-50 hover:text-green-700"
              )}>
              <Blocks className="h-3.5 w-3.5" />
              All types
            </button>
            {types?.map((t) => {
              const Icon = t.type === "Startup" ? Rocket : t.type === "Growth" ? TrendingUp : t.type === "Public" ? Landmark : Building;
              return (
                <button key={t.type} type="button" onClick={() => setSelectedType(selectedType === t.type ? null : t.type)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                    selectedType === t.type ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                  )}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{t.type}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    selectedType === t.type ? "bg-white/20" : "bg-gray-100 text-gray-500"
                  )}>{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-3 h-px bg-gray-100" />

        {/* Stage */}
        <div className="px-3 py-3">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-green-500">Stage</span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {stages?.map((s) => {
              const Icon = s.stage === "Seed" ? Sprout : s.stage.startsWith("Series") ? CircleDollarSign : s.stage === "Growth" ? TrendingUp : Landmark;
              return (
                <button key={s.stage} type="button" onClick={() => setSelectedStage(selectedStage === s.stage ? null : s.stage)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                    selectedStage === s.stage ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                  )}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{s.stage}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    selectedStage === s.stage ? "bg-white/20" : "bg-gray-100 text-gray-500"
                  )}>{s.count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-3 h-px bg-gray-100" />

        {/* Area */}
        <div className="px-3 py-3">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-green-500">Area</span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {areas?.map((a) => (
              <button key={a.area} type="button" onClick={() => setSelectedArea(selectedArea === a.area ? null : a.area)}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                  selectedArea === a.area ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                )}>
                <MapPinned className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{a.area}</span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  selectedArea === a.area ? "bg-white/20" : "bg-gray-100 text-gray-500"
                )}>{a.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mx-3 h-px bg-gray-100" />

        {/* Sector */}
        <div className="px-3 py-3">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-green-500">Sector</span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <button type="button" onClick={() => setSelectedSector(null)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                selectedSector === null ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-600 hover:bg-green-50 hover:text-green-700"
              )}>
              <Factory className="h-3.5 w-3.5" />
              All sectors
            </button>
            {sectors?.map((s) => {
              const active = selectedSector === s.sector;
              const cfg = getSectorConfig(s.sector) ?? DEFAULT_SECTOR;
              return (
                <button key={s.sector} type="button" onClick={() => setSelectedSector(active ? null : s.sector)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                    active ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-md shadow-green-500/20" : "text-gray-500 hover:bg-green-50 hover:text-green-700"
                  )}>
                  <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: cfg.color, background: active ? "white" : `${cfg.color}20` }} />
                  <span className="flex-1 text-left">{s.sector}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/20" : "bg-gray-100 text-gray-500"
                  )}>{s.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Attribution ── */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400">
        MapLibre | © CARTO | © OpenStreetMap
      </div>
    </div>
  );
}
