import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import {
  ArrowRight, ArrowUpRight, Sparkles, ShieldCheck, ScanSearch, FileSignature,
  Workflow, Brain, BadgeCheck, Clock3, CircleDollarSign, Users2, Building2,
  BarChart3, Lock, KeyRound, Database, Server, Activity, Cpu, Bot, Scale,
  Briefcase, Search, ChevronDown, ChevronRight, Check, X, Plus, Minus,
  CalendarDays, FileText, Mail, Phone, MapPin, Quote, Star, Zap, Target,
  TrendingUp, Globe2, Layers, GitBranch, MessageSquare, Bell, AlertTriangle,
  ChevronLeft, PlayCircle, ListChecks, BookOpenCheck, Gauge, LineChart,
} from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';

/* =========================================================================
   LawTech — Premium Landing v2
   Stack: React + Emotion + lucide-react. Light/dark via existing CSS vars.
   ========================================================================= */

/* ---------- KEYFRAMES ---------- */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
`;
const drift = keyframes`
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50%      { transform: translate3d(18px,-12px,0) scale(1.04); }
`;
const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
const pulseDot = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
  50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
`;
const scrollX = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const ringSpin = keyframes`
  to { transform: rotate(360deg); }
`;
const ticker = keyframes`
  0%   { transform: translateY(0); }
  100% { transform: translateY(-100%); }
`;

/* ---------- LAYOUT PRIMITIVES ---------- */
const Page = styled.div`
  --page-fg: var(--color-text, #0a0a0a);
  --page-muted: var(--color-text-secondary, #525866);
  --page-bg: var(--color-bg, #fafafa);
  --page-elev: var(--color-bg-elevated, #ffffff);
  --page-border: var(--color-border, rgba(15,23,42,0.08));
  --accent: #2563eb;
  --accent-2: #059669;
  --accent-3: #7c3aed;
  --ink: #0b1220;

  position: relative;
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--page-fg);
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, sans-serif;
  font-feature-settings: 'ss01','cv11','cv05';
  letter-spacing: -0.012em;
  overflow-x: hidden;
`;

const Shell = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 28px;
  @media (max-width: 720px) { padding: 0 18px; }
`;

const Glass = styled.div`
  background: color-mix(in srgb, var(--page-elev) 86%, transparent);
  border: 1px solid var(--page-border);
  border-radius: 24px;
  backdrop-filter: saturate(140%) blur(20px);
  -webkit-backdrop-filter: saturate(140%) blur(20px);
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--page-fg);
  background: color-mix(in srgb, var(--page-elev) 88%, transparent);
  border: 1px solid var(--page-border);

  svg { width: 14px; height: 14px; color: var(--accent); }
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: clamp(34px, 4.4vw, 60px);
  line-height: 1.02;
  letter-spacing: -0.055em;
  font-weight: 900;

  em {
    font-style: normal;
    background: linear-gradient(120deg, var(--accent), var(--accent-2) 55%, var(--accent-3));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const SectionLead = styled.p`
  margin: 18px 0 0;
  max-width: 640px;
  font-size: 17px;
  line-height: 1.55;
  color: var(--page-muted);
`;

const Section = styled.section`
  position: relative;
  padding: clamp(80px, 9vw, 140px) 0;
`;

/* Reveal-on-scroll wrapper */
const Reveal = styled.div<{ delay?: number }>`
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1);
  transition-delay: ${(p) => (p.delay ?? 0)}ms;

  &.in {
    opacity: 1;
    transform: translateY(0);
  }
`;

/* ---------- HEADER ---------- */
const HeaderWrap = styled.header<{ scrolled: boolean }>`
  position: fixed;
  top: 18px;
  left: 0; right: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  pointer-events: none;
  transition: top .35s ease;
  ${(p) => p.scrolled && css`top: 10px;`}
`;
const HeaderInner = styled.div<{ scrolled: boolean }>`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 14px 10px 18px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-elev) ${(p) => p.scrolled ? '92%' : '78%'}, transparent);
  border: 1px solid var(--page-border);
  backdrop-filter: saturate(160%) blur(22px);
  -webkit-backdrop-filter: saturate(160%) blur(22px);
  box-shadow: ${(p) => p.scrolled ? '0 18px 50px rgba(2,6,23,0.12)' : '0 10px 30px rgba(2,6,23,0.06)'};
  transition: all .35s ease;

  @media (max-width: 880px) {
    gap: 10px;
    padding: 8px 10px 8px 14px;
  }
`;
const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--page-fg);
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: 17px;
`;
const BrandMark = styled.div`
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: white;
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), transparent 35%),
    linear-gradient(135deg, #0f172a, #1e3a8a 55%, #2563eb);
  box-shadow: 0 8px 18px rgba(37,99,235,0.30);
  &::after {
    content: '';
    position: absolute; inset: 2px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    pointer-events: none;
  }
  svg { width: 17px; height: 17px; }
`;
const NavList = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-left: 1px solid var(--page-border);
  border-right: 1px solid var(--page-border);
  margin: 0 4px;
  @media (max-width: 880px) { display: none; }
`;
const NavA = styled.a`
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--page-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  transition: color .2s, background .2s;
  &:hover { color: var(--page-fg); background: color-mix(in srgb, var(--page-fg) 5%, transparent); }
`;
const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const baseBtn = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-decoration: none;
  border-radius: 12px;
  padding: 11px 18px;
  font-size: 14px;
  transition: transform .15s, box-shadow .25s, background .2s, color .2s, border-color .2s;
  border: 1px solid transparent;
  white-space: nowrap;
  &:active { transform: translateY(1px); }
  svg { width: 16px; height: 16px; }
`;
const PrimaryBtn = styled(Link)`
  ${baseBtn};
  color: white;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #2563eb 130%);
  box-shadow: 0 14px 32px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.12);
  &:hover {
    box-shadow: 0 22px 50px rgba(15,23,42,0.34), inset 0 1px 0 rgba(255,255,255,0.18);
    transform: translateY(-1px);
  }
`;
const GhostBtn = styled(Link)`
  ${baseBtn};
  color: var(--page-fg);
  background: color-mix(in srgb, var(--page-elev) 70%, transparent);
  border-color: var(--page-border);
  &:hover {
    background: color-mix(in srgb, var(--page-elev) 95%, transparent);
    border-color: color-mix(in srgb, var(--page-fg) 18%, var(--page-border));
  }
`;
const TextLink = styled.a`
  ${baseBtn};
  color: var(--page-fg);
  background: transparent;
  padding: 11px 12px;
  &:hover { color: var(--accent); }
`;

/* ---------- HERO ---------- */
const HeroWrap = styled(Section)`
  padding-top: clamp(140px, 16vh, 200px);
  padding-bottom: clamp(60px, 6vw, 90px);
  overflow: hidden;
`;
const HeroBg = styled.div`
  position: absolute;
  inset: -10% -5% auto -5%;
  height: 90%;
  pointer-events: none;
  z-index: 0;
  &::before, &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.55;
    animation: ${drift} 18s ease-in-out infinite;
  }
  &::before {
    top: 4%; left: -6%;
    width: 540px; height: 540px;
    background: radial-gradient(circle, rgba(37,99,235,0.55), transparent 60%);
  }
  &::after {
    top: 22%; right: -8%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(16,185,129,0.45), transparent 60%);
    animation-delay: -7s;
  }
`;
const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: clamp(36px, 5vw, 80px);
  align-items: center;
  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;
const HeroHeadline = styled.h1`
  margin: 22px 0 0;
  font-size: clamp(44px, 6.2vw, 84px);
  line-height: 0.96;
  letter-spacing: -0.065em;
  font-weight: 950;

  em {
    font-style: normal;
    position: relative;
    background: linear-gradient(110deg, #0b1220 0%, #1e3a8a 38%, #2563eb 70%, #059669 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;
const HeroSub = styled.p`
  margin: 22px 0 0;
  max-width: 560px;
  font-size: clamp(16px, 1.4vw, 19px);
  line-height: 1.55;
  color: var(--page-muted);

  b { color: var(--page-fg); font-weight: 700; }
`;
const HeroCTA = styled.div`
  margin: 32px 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;
const HeroProof = styled.div`
  margin-top: 30px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--page-muted);
  font-size: 13.5px;
  b { color: var(--page-fg); }
`;
const Stack = styled.div`
  display: flex;
  align-items: center;
  & > * + * { margin-left: -10px; }
`;
const Avatar = styled.div<{ hue?: number }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    hsl(${(p) => p.hue ?? 220}, 70%, 60%),
    hsl(${(p) => (p.hue ?? 220) + 30}, 70%, 45%));
  border: 2px solid var(--page-elev);
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
`;

/* ---------- HERO DEVICE / DASHBOARD MOCK ---------- */
const DeviceWrap = styled.div`
  position: relative;
  perspective: 1600px;
`;
const Device = styled.div`
  position: relative;
  border-radius: 22px;
  background: linear-gradient(160deg, #0f172a 0%, #111827 50%, #0b1220 100%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 50px 110px -30px rgba(2,6,23,0.55),
    0 24px 60px -24px rgba(37,99,235,0.35),
    inset 0 1px 0 rgba(255,255,255,0.06);
  overflow: hidden;
  transform: rotateX(2deg) rotateY(-6deg);
  transition: transform .6s ease;
  &:hover { transform: rotateX(0deg) rotateY(0deg); }
`;
const Dashboard = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 480px;
`;
const DashTop = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;
const WinDots = styled.div`
  display: flex; gap: 6px;
  span {
    width: 10px; height: 10px; border-radius: 50%;
    background: rgba(255,255,255,0.14);
  }
  span:first-of-type { background: #ef4444aa; }
  span:nth-of-type(2) { background: #f59e0baa; }
  span:nth-of-type(3) { background: #10b981aa; }
`;
const LiveBadge = styled.span`
  display: inline-flex; align-items: center; gap: 7px;
  color: #d1fae5;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.25);
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  &::before {
    content: '';
    width: 6px; height: 6px; border-radius: 50%;
    background: #10b981;
    animation: ${pulseDot} 1.6s ease-out infinite;
  }
`;
const DashBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 0;
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;
const SideNav = styled.aside`
  padding: 14px 12px;
  border-right: 1px solid rgba(255,255,255,0.06);
  display: grid;
  gap: 4px;
  align-content: start;
  @media (max-width: 520px) { display: none; }
`;
const SideItem = styled.div<{ active?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${(p) => p.active ? 'white' : 'rgba(226,232,240,0.7)'};
  background: ${(p) => p.active ? 'rgba(255,255,255,0.06)' : 'transparent'};
  border: 1px solid ${(p) => p.active ? 'rgba(255,255,255,0.08)' : 'transparent'};
  svg { width: 14px; height: 14px; }
`;
const SideLabel = styled.div`
  padding: 12px 10px 6px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148,163,184,0.7);
`;
const Workspace = styled.div`
  padding: 18px;
  display: grid;
  gap: 14px;
  grid-template-rows: auto auto auto 1fr;
  background:
    radial-gradient(circle at 90% 0%, rgba(37,99,235,0.18), transparent 40%),
    radial-gradient(circle at 0% 100%, rgba(16,185,129,0.12), transparent 40%);
`;
const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;
const Kpi = styled.div`
  padding: 12px 13px;
  border-radius: 12px;
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(255,255,255,0.07);
  small {
    display: block;
    color: rgba(148,163,184,0.9);
    font-size: 10.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  strong {
    display: block;
    margin-top: 4px;
    color: white;
    font-size: 19px;
    letter-spacing: -0.04em;
    font-weight: 850;
  }
  span {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #34d399;
  }
`;
const ContractCard = styled.div`
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
    rgba(15,23,42,0.6);
  border: 1px solid rgba(255,255,255,0.07);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
`;
const ContractTitle = styled.div`
  color: white;
  font-weight: 700;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  small {
    display: block;
    color: rgba(148,163,184,0.8);
    font-weight: 500;
    font-size: 11.5px;
    margin-top: 2px;
  }
`;
const Score = styled.div`
  display: grid; place-items: center;
  width: 54px; height: 54px;
  border-radius: 50%;
  background: conic-gradient(#10b981 0 88%, rgba(255,255,255,0.08) 88% 100%);
  span {
    display: grid; place-items: center;
    width: 44px; height: 44px;
    background: #0b1220;
    border-radius: 50%;
    color: #d1fae5;
    font-weight: 800;
    letter-spacing: -0.04em;
    font-size: 13px;
  }
`;
const RiskList = styled.div`
  display: grid; gap: 8px;
`;
const RiskItem = styled.div<{ tone: 'high' | 'med' | 'low' }>`
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(226,232,240,0.92);
  font-size: 12px;

  & > i {
    display: block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: ${(p) => p.tone === 'high' ? '#ef4444' : p.tone === 'med' ? '#f59e0b' : '#10b981'};
    box-shadow: 0 0 0 3px ${(p) => p.tone === 'high' ? 'rgba(239,68,68,0.18)'
      : p.tone === 'med' ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)'};
  }
  small { color: rgba(148,163,184,0.85); font-weight: 600; letter-spacing: 0.02em; }
`;
const AskAi = styled.div`
  margin-top: auto;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(37,99,235,0.22), rgba(124,58,237,0.18));
  border: 1px solid rgba(124,58,237,0.35);
  display: flex; align-items: center; gap: 10px;
  color: rgba(241,245,249,0.95);
  font-size: 12.5px;
  svg { width: 16px; height: 16px; color: #c4b5fd; }
  span.cursor {
    display: inline-block; width: 7px; height: 14px; background: #c4b5fd;
    vertical-align: -2px; margin-left: 4px;
    animation: ${pulseDot} 1s steps(2) infinite;
  }
`;

const FloatCard = styled.div<{ top?: string; left?: string; right?: string; bottom?: string; delay?: number }>`
  position: absolute;
  ${(p) => p.top    && css`top: ${p.top};`}
  ${(p) => p.left   && css`left: ${p.left};`}
  ${(p) => p.right  && css`right: ${p.right};`}
  ${(p) => p.bottom && css`bottom: ${p.bottom};`}
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--page-elev) 96%, transparent);
  border: 1px solid var(--page-border);
  box-shadow: 0 22px 50px rgba(2,6,23,0.18);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--page-fg);
  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${(p) => (p.delay ?? 0)}s;

  svg { width: 16px; height: 16px; color: var(--accent-2); }
  small { display: block; font-weight: 500; color: var(--page-muted); }
`;

/* ---------- TRUST BAR + LOGOS ---------- */
const TrustBar = styled.div`
  margin-top: 56px;
  padding: 26px 28px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--page-elev) 70%, transparent);
  border: 1px solid var(--page-border);
  display: grid;
  grid-template-columns: 1.1fr 2fr;
  align-items: center;
  gap: 32px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;
const TrustText = styled.div`
  font-size: 12.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--page-muted);
  font-weight: 700;
  b { color: var(--page-fg); }
`;
const Logos = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;
const LogoTile = styled.div`
  display: grid;
  place-items: center;
  height: 56px;
  border-radius: 14px;
  border: 1px solid var(--page-border);
  background: color-mix(in srgb, var(--page-elev) 90%, transparent);
  color: var(--page-fg);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 14px;
  opacity: 0.86;
  transition: opacity .2s, transform .2s;
  &:hover { opacity: 1; transform: translateY(-2px); }

  span:first-of-type {
    display: inline-grid; place-items: center;
    width: 26px; height: 26px;
    margin-right: 8px;
    border-radius: 7px;
    color: white;
    background: linear-gradient(135deg, #0f172a, #2563eb);
    font-size: 12px;
  }
`;

/* ---------- SECTION HEAD ---------- */
const SectionHead = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-items: end;
  gap: 32px;
  margin-bottom: 56px;
  @media (max-width: 880px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;
const SectionHeadAside = styled.div`
  color: var(--page-muted);
  font-size: 15px;
  line-height: 1.6;
  max-width: 420px;
  justify-self: end;
  @media (max-width: 880px) { justify-self: start; }
`;

/* ---------- PRODUCT SHOWCASE (alternating big rows) ---------- */
const Showcase = styled.div`
  display: grid;
  gap: 28px;
`;
const ShowRow = styled.div<{ reverse?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: clamp(28px, 4vw, 64px);
  align-items: center;
  padding: clamp(28px, 3.6vw, 56px);
  border-radius: 32px;
  background: color-mix(in srgb, var(--page-elev) 78%, transparent);
  border: 1px solid var(--page-border);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: -40% -20% auto auto;
    width: 480px; height: 480px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%);
    pointer-events: none;
  }

  ${(p) => p.reverse && css`
    & > .copy { order: 2; }
    & > .visual { order: 1; }
    &::before {
      inset: auto auto -40% -20%;
      background: radial-gradient(circle, rgba(16,185,129,0.20), transparent 70%);
    }
  `}

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    & > .copy, & > .visual { order: initial !important; }
  }
`;
const ShowCopy = styled.div`
  position: relative;
  z-index: 1;
  h3 {
    margin: 14px 0 0;
    font-size: clamp(26px, 3vw, 40px);
    line-height: 1.06;
    letter-spacing: -0.05em;
    font-weight: 900;
  }
  p {
    margin: 16px 0 0;
    color: var(--page-muted);
    font-size: 16px;
    line-height: 1.6;
    max-width: 520px;
  }
`;
const ShowChips = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 22px;
`;
const Chip = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 11px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-elev) 92%, transparent);
  border: 1px solid var(--page-border);
  color: var(--page-fg);
  font-size: 12.5px;
  font-weight: 600;
  svg { width: 13px; height: 13px; color: var(--accent-2); }
`;
const ShowVisual = styled.div`
  position: relative;
  z-index: 1;
  min-height: 320px;
  border-radius: 24px;
  padding: 18px;
  background: linear-gradient(160deg, #0f172a, #0b1220);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 30px 60px -20px rgba(2,6,23,0.45);
  overflow: hidden;
`;
const SectionIcon = styled.div`
  display: inline-grid; place-items: center;
  width: 48px; height: 48px; border-radius: 14px;
  color: white;
  background: linear-gradient(135deg, #0f172a, #1e40af 55%, #2563eb);
  box-shadow: 0 12px 24px rgba(37,99,235,0.30);
  svg { width: 22px; height: 22px; }
`;

/* ---------- BENTO ---------- */
const Bento = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: minmax(180px, auto);
  gap: 18px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media (max-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;
const Cell = styled.div<{ span?: number; tall?: boolean; dark?: boolean }>`
  position: relative;
  grid-column: span ${(p) => p.span ?? 2};
  grid-row: span ${(p) => p.tall ? 2 : 1};
  padding: 26px;
  border-radius: 22px;
  background: ${(p) => p.dark
    ? 'linear-gradient(160deg, #0b1220, #111827)'
    : 'color-mix(in srgb, var(--page-elev) 86%, transparent)'};
  border: 1px solid ${(p) => p.dark ? 'rgba(255,255,255,0.08)' : 'var(--page-border)'};
  color: ${(p) => p.dark ? '#e2e8f0' : 'var(--page-fg)'};
  overflow: hidden;

  h4 {
    margin: 14px 0 0;
    font-size: 19px;
    letter-spacing: -0.03em;
    font-weight: 800;
  }
  p {
    margin: 10px 0 0;
    color: ${(p) => p.dark ? 'rgba(203,213,225,0.85)' : 'var(--page-muted)'};
    font-size: 14px;
    line-height: 1.55;
  }
  @media (max-width: 1080px) {
    grid-column: span ${(p) => Math.min(p.span ?? 2, 4)};
  }
  @media (max-width: 720px) {
    grid-column: span 2 !important;
    grid-row: auto;
  }
`;
const CellIcon = styled.div<{ tone?: 'blue' | 'green' | 'violet' | 'amber' }>`
  display: inline-grid; place-items: center;
  width: 42px; height: 42px; border-radius: 12px;
  color: white;
  ${(p) => {
    const t = p.tone ?? 'blue';
    const map = {
      blue:   'linear-gradient(135deg, #1e3a8a, #2563eb)',
      green:  'linear-gradient(135deg, #065f46, #059669)',
      violet: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
      amber:  'linear-gradient(135deg, #92400e, #f59e0b)',
    } as const;
    return css`background: ${map[t]};`;
  }}
  box-shadow: 0 10px 20px rgba(0,0,0,0.12);
  svg { width: 20px; height: 20px; }
`;

/* ---------- ROLES TABS ---------- */
const Tabs = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 6px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--page-elev) 70%, transparent);
  border: 1px solid var(--page-border);
  width: max-content;
  max-width: 100%;
`;
const Tab = styled.button<{ active?: boolean }>`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: ${(p) => p.active ? 'var(--page-elev)' : 'transparent'};
  color: ${(p) => p.active ? 'var(--page-fg)' : 'var(--page-muted)'};
  box-shadow: ${(p) => p.active ? '0 6px 18px rgba(2,6,23,0.10)' : 'none'};
  border-color: ${(p) => p.active ? 'var(--page-border)' : 'transparent'};
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background .2s, color .2s, box-shadow .25s, border-color .2s;
  svg { width: 15px; height: 15px; }
  &:hover { color: var(--page-fg); }
`;
const RolePanel = styled.div`
  margin-top: 28px;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 36px;
  align-items: stretch;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`;
const RoleCopy = styled.div`
  h3 {
    margin: 0;
    font-size: clamp(24px, 2.8vw, 36px);
    line-height: 1.08;
    letter-spacing: -0.045em;
    font-weight: 850;
  }
  p {
    margin: 14px 0 0;
    color: var(--page-muted);
    font-size: 15.5px;
    line-height: 1.6;
    max-width: 520px;
  }
`;
const RoleList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 22px 0 0;
  display: grid; gap: 10px;
  li {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 12px;
    align-items: start;
    color: var(--page-fg);
    font-size: 15px;
    line-height: 1.5;
  }
  li b { font-weight: 700; }
  li > span {
    display: grid; place-items: center;
    width: 24px; height: 24px;
    border-radius: 50%;
    color: var(--accent-2);
    background: rgba(16,185,129,0.12);
    flex-shrink: 0;
  }
  li > span > svg { width: 14px; height: 14px; }
  li b { color: var(--page-fg); margin-right: 6px; }
`;
const RoleVisual = styled(Glass)`
  padding: 24px;
  border-radius: 26px;
  background:
    radial-gradient(circle at 90% 0%, rgba(124,58,237,0.10), transparent 40%),
    radial-gradient(circle at 0% 100%, rgba(16,185,129,0.10), transparent 40%),
    color-mix(in srgb, var(--page-elev) 88%, transparent);
`;
const TaskRow = styled.div`
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--page-elev) 96%, transparent);
  border: 1px solid var(--page-border);
  & + & { margin-top: 10px; }
  small { color: var(--page-muted); font-weight: 600; }
`;
const TaskCheck = styled.span<{ done?: boolean }>`
  display: grid; place-items: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  color: ${(p) => p.done ? '#059669' : 'var(--page-muted)'};
  background: ${(p) => p.done ? 'rgba(16,185,129,0.15)' : 'color-mix(in srgb, var(--page-fg) 6%, transparent)'};
  svg { width: 12px; height: 12px; }
`;

/* ---------- PROCESS / TIMELINE ---------- */
const Steps = styled.ol`
  list-style: none;
  margin: 0; padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  counter-reset: step;

  @media (max-width: 1080px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px)  { grid-template-columns: 1fr; }
`;
const Step = styled.li`
  position: relative;
  padding: 26px 22px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--page-elev) 86%, transparent);
  border: 1px solid var(--page-border);
  counter-increment: step;

  &::before {
    content: counter(step, decimal-leading-zero);
    position: absolute;
    top: 18px; right: 22px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--accent);
  }

  h4 {
    margin: 18px 0 0;
    font-size: 18px;
    letter-spacing: -0.025em;
    font-weight: 800;
  }
  p {
    margin: 8px 0 0;
    color: var(--page-muted);
    font-size: 14px;
    line-height: 1.55;
  }
`;

/* ---------- COMPARISON (Before/After) ---------- */
const Compare = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`;
const ComparePane = styled.div<{ good?: boolean }>`
  position: relative;
  padding: 28px;
  border-radius: 24px;
  background: ${(p) => p.good
    ? 'linear-gradient(170deg, color-mix(in srgb, var(--page-elev) 92%, transparent), color-mix(in srgb, var(--accent) 8%, var(--page-elev)))'
    : 'color-mix(in srgb, var(--page-elev) 78%, transparent)'};
  border: 1px solid ${(p) => p.good ? 'color-mix(in srgb, var(--accent) 25%, var(--page-border))' : 'var(--page-border)'};
  overflow: hidden;

  & > header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 16px;
  }
  & > header strong {
    font-size: 14px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${(p) => p.good ? 'var(--accent)' : 'var(--page-muted)'};
    font-weight: 800;
  }
  h3 {
    margin: 4px 0 0;
    font-size: clamp(22px, 2.5vw, 30px);
    letter-spacing: -0.04em;
    line-height: 1.1;
    font-weight: 850;
  }
`;
const CompareList = styled.ul`
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: grid; gap: 10px;
  li {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 12px;
    align-items: start;
    color: var(--page-fg);
    font-size: 14.5px;
    line-height: 1.55;
  }
  li span {
    display: grid; place-items: center;
    width: 22px; height: 22px;
    border-radius: 50%;
  }
  li svg { width: 12px; height: 12px; }
  li.bad span  { color: #ef4444; background: rgba(239,68,68,0.10); }
  li.good span { color: var(--accent-2); background: rgba(16,185,129,0.15); }
`;

/* ---------- STATS COUNTER ---------- */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  @media (max-width: 880px) { grid-template-columns: repeat(2, 1fr); }
`;
const StatCard = styled(Glass)`
  padding: 28px;
  border-radius: 24px;
  text-align: left;
  strong {
    display: block;
    font-size: clamp(36px, 4.5vw, 56px);
    line-height: 1;
    letter-spacing: -0.06em;
    font-weight: 950;
    background: linear-gradient(120deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  small {
    display: block;
    margin-top: 10px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--page-muted);
  }
`;

/* ---------- TESTIMONIALS ---------- */
const Testimonials = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  @media (max-width: 1080px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 720px)  { grid-template-columns: 1fr; }
`;
const TQuote = styled.figure`
  margin: 0;
  padding: 28px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--page-elev) 90%, transparent);
  border: 1px solid var(--page-border);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;

  & > svg { width: 22px; height: 22px; color: var(--accent); opacity: 0.8; }

  blockquote {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--page-fg);
    letter-spacing: -0.005em;
  }
  figcaption {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 12px;
    align-items: center;
    color: var(--page-muted);
    font-size: 13px;
  }
  figcaption strong { color: var(--page-fg); display: block; font-size: 14px; }
`;
const RatingRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  color: #f59e0b;
  svg { width: 14px; height: 14px; fill: currentColor; }
`;

/* ---------- SECURITY (dark) ---------- */
const Sec = styled(Section)`
  background:
    radial-gradient(circle at 12% 18%, rgba(37,99,235,0.20), transparent 35rem),
    radial-gradient(circle at 88% 88%, rgba(16,185,129,0.16), transparent 32rem),
    linear-gradient(160deg, #0a0f1c, #0b1220 60%, #050912);
  color: #e2e8f0;
  border-radius: 38px;
  margin: 0 28px;
  overflow: hidden;
  position: relative;
  @media (max-width: 720px) { margin: 0 14px; border-radius: 28px; }
  &::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px);
    background-size: 36px 36px;
    mask: radial-gradient(circle at 50% 50%, black 40%, transparent 80%);
    pointer-events: none;
  }
`;
const SecGrid = styled.div`
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`;
const SecBadges = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 28px;
`;
const SecBadge = styled.div`
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  strong { color: white; font-weight: 700; font-size: 14px; display: block; }
  small { color: rgba(203,213,225,0.7); font-size: 12px; }
  span {
    display: grid; place-items: center;
    width: 38px; height: 38px;
    border-radius: 10px;
    color: white;
    background: linear-gradient(135deg, #065f46, #10b981);
  }
  svg { width: 18px; height: 18px; }
`;
const Vault = styled.div`
  position: relative;
  padding: 30px;
  border-radius: 26px;
  background:
    radial-gradient(circle at 50% 0%, rgba(37,99,235,0.30), transparent 50%),
    rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
`;
const Ring = styled.div`
  position: relative;
  width: 280px; height: 280px;
  border-radius: 50%;
  margin: 0 auto;
  display: grid; place-items: center;
  &::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 1px dashed rgba(148,163,184,0.30);
    animation: ${ringSpin} 30s linear infinite;
  }
  &::after {
    content: '';
    position: absolute; inset: 28px;
    border-radius: 50%;
    border: 1px solid rgba(148,163,184,0.18);
    animation: ${ringSpin} 18s linear infinite reverse;
  }
`;
const Lockey = styled.div`
  position: relative;
  width: 140px; height: 140px;
  border-radius: 50%;
  display: grid; place-items: center;
  color: white;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), transparent 35%),
              linear-gradient(135deg, #1e40af, #2563eb 55%, #7c3aed);
  box-shadow: 0 30px 70px rgba(37,99,235,0.45);
  svg { width: 54px; height: 54px; }
`;
const Orbit = styled.div<{ angle: number; r: number; delay?: number }>`
  position: absolute;
  inset: 0;
  display: grid; place-items: center;
  pointer-events: none;
  & > span {
    position: absolute;
    top: 50%; left: 50%;
    width: 44px; height: 44px;
    margin: -22px 0 0 -22px;
    transform: rotate(${(p) => p.angle}deg) translateY(-${(p) => p.r}px) rotate(-${(p) => p.angle}deg);
    border-radius: 12px;
    display: grid; place-items: center;
    color: white;
    background: rgba(15,23,42,0.55);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 10px 24px rgba(2,6,23,0.35);
    animation: ${float} 5s ease-in-out infinite;
    animation-delay: ${(p) => (p.delay ?? 0)}s;
    svg { width: 20px; height: 20px; color: #93c5fd; }
  }
`;

/* ---------- PRICING ---------- */
const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  align-items: stretch;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`;
const PriceCard = styled.div<{ featured?: boolean }>`
  position: relative;
  padding: 32px 30px;
  border-radius: 26px;
  background: ${(p) => p.featured
    ? 'linear-gradient(170deg, #0b1220, #111827)'
    : 'color-mix(in srgb, var(--page-elev) 88%, transparent)'};
  color: ${(p) => p.featured ? 'white' : 'var(--page-fg)'};
  border: 1px solid ${(p) => p.featured ? 'rgba(255,255,255,0.10)' : 'var(--page-border)'};
  box-shadow: ${(p) => p.featured ? '0 40px 80px -30px rgba(37,99,235,0.45)' : 'none'};
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  ${(p) => p.featured && css`
    &::before {
      content: '';
      position: absolute; inset: -50% -10% auto auto;
      width: 360px; height: 360px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(37,99,235,0.40), transparent 60%);
      pointer-events: none;
    }
  `}

  h3 {
    margin: 0;
    color: inherit;
    font-size: 22px;
    letter-spacing: -0.03em;
    font-weight: 800;
  }
  & > p.desc {
    margin: 6px 0 0;
    font-size: 13.5px;
    color: ${(p) => p.featured ? 'rgba(203,213,225,0.85)' : 'var(--page-muted)'};
  }
`;
const PriceTag = styled.div<{ featured?: boolean }>`
  margin: 22px 0 22px;
  display: flex; align-items: baseline; gap: 8px;
  & > .num {
    font-size: 44px;
    font-weight: 950;
    letter-spacing: -0.05em;
    line-height: 1;
  }
  & > .per {
    color: ${(p) => p.featured ? 'rgba(203,213,225,0.8)' : 'var(--page-muted)'};
    font-size: 14px;
    font-weight: 600;
  }
`;
const Feats = styled.ul`
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: grid; gap: 10px;
  li {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 10px;
    align-items: start;
    font-size: 14px;
    line-height: 1.55;
  }
  li svg { width: 14px; height: 14px; margin-top: 4px; }
`;
const FeaturedBadge = styled.span`
  position: absolute;
  top: 14px; right: 14px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: white;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  box-shadow: 0 8px 16px rgba(239,68,68,0.30);
  svg { width: 11px; height: 11px; }
`;

/* ---------- FAQ accordion ---------- */
const FaqList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 26px;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`;
const FaqItem = styled.details`
  border: 1px solid var(--page-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--page-elev) 86%, transparent);
  overflow: hidden;
  &[open] { background: color-mix(in srgb, var(--page-elev) 96%, transparent); }
  & > summary {
    list-style: none;
    cursor: pointer;
    padding: 20px 22px;
    display: grid;
    grid-template-columns: 1fr 22px;
    gap: 16px;
    align-items: center;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  & > summary::-webkit-details-marker { display: none; }
  & > summary > span.chev {
    display: grid; place-items: center;
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1px solid var(--page-border);
    transition: transform .25s;
    color: var(--page-fg);
  }
  &[open] > summary > span.chev { transform: rotate(45deg); }
  & > div.body {
    padding: 0 22px 20px;
    color: var(--page-muted);
    font-size: 14.5px;
    line-height: 1.6;
  }
`;

/* ---------- FINAL CTA ---------- */
const FinalCta = styled.div`
  position: relative;
  padding: clamp(40px, 6vw, 80px);
  border-radius: 38px;
  overflow: hidden;
  text-align: center;
  background:
    radial-gradient(circle at 50% -20%, rgba(255,255,255,0.20), transparent 40%),
    linear-gradient(165deg, #0a0f1c 0%, #0b1220 55%, #111827 100%);
  border: 1px solid rgba(255,255,255,0.06);
  color: white;
  box-shadow: 0 40px 110px -30px rgba(2,6,23,0.50);

  &::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 15% 90%, rgba(37,99,235,0.40), transparent 40%),
      radial-gradient(circle at 85% 80%, rgba(16,185,129,0.30), transparent 35%);
    pointer-events: none;
  }
  & > * { position: relative; }

  h2 {
    margin: 0;
    color: #ffffff;
    font-size: clamp(36px, 5vw, 64px);
    line-height: 1.02;
    letter-spacing: -0.06em;
    font-weight: 950;
    em {
      font-style: normal;
      background: linear-gradient(120deg, #c7d2fe, #a7f3d0);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }
  p {
    margin: 18px auto 0;
    max-width: 580px;
    color: rgba(226,232,240,0.85);
    font-size: 17px;
    line-height: 1.55;
  }
`;
const FinalActions = styled.div`
  margin: 28px auto 0;
  display: flex; flex-wrap: wrap; gap: 12px;
  justify-content: center;
`;
const WhiteBtn = styled(Link)`
  ${baseBtn};
  color: #0b1220;
  background: white;
  &:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(255,255,255,0.18); }
`;
const OutlineWhite = styled.a`
  ${baseBtn};
  color: white;
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.18);
  &:hover { background: rgba(255,255,255,0.10); }
`;

/* ---------- FOOTER ---------- */
const FooterWrap = styled.footer`
  margin-top: 80px;
  padding: 60px 0 40px;
  border-top: 1px solid var(--page-border);
`;
const FootGrid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr repeat(4, 1fr);
  gap: 36px;
  @media (max-width: 980px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;
const FootCol = styled.div`
  h5 {
    margin: 0 0 14px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--page-muted);
    font-weight: 800;
  }
  ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  a {
    color: var(--page-fg);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    &:hover { color: var(--accent); }
  }
`;
const FootBottom = styled.div`
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--page-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  color: var(--page-muted);
  font-size: 13px;
`;

/* ---------- COUNTER COMPONENT ---------- */
function useInView<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }),
      opts ?? { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function Counter({ to, suffix = '', duration = 1400, decimals = 0 }: { to: number; suffix?: string; duration?: number; decimals?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(to * eased);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, to, duration]);
  return <span ref={ref}>{v.toFixed(decimals)}{suffix}</span>;
}

/* ---------- SCROLL-IN HOOK FOR ALL .reveal ---------- */
function useRevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- DATA ---------- */
const clients = [
  { mono: 'AB', name: 'А\u00A0и\u00A0Бэр' },
  { mono: 'KP', name: 'Кон\u00A0Пра' },
  { mono: 'ЮП', name: 'ЮрПро' },
  { mono: 'LF', name: 'LegalFirm' },
  { mono: 'СК', name: 'СК\u00A0Group' },
];

const showcase = [
  {
    icon: <ScanSearch />,
    eyebrow: 'AI‑анализ договоров',
    title: 'Видит риски, которые юрист не успевает заметить',
    text: 'LawTech читает договор за минуту: подсвечивает 18 типовых рисков, сравнивает с вашими «золотыми» шаблонами, предлагает редакторские правки прямо в тексте. Без галлюцинаций: каждая претензия привязана к пункту документа.',
    chips: ['18 типов рисков', 'Сравнение с эталоном', 'Цитаты из текста', 'Экспорт в Word'],
  },
  {
    icon: <Workflow />,
    eyebrow: 'CRM для юридического бизнеса',
    title: 'Один контур: клиенты, дела, документы, выручка',
    text: 'Все сущности связаны: клиент → дело → задачи → документы → оплаты. Никаких «потерял в чате», «забыли продлить», «где договор?». Карточка клиента собирает контекст за 2 секунды.',
    chips: ['Карточки клиентов и дел', 'Календарь и сроки', 'Биллинг и счёт', 'Файлы и версии'],
  },
  {
    icon: <Brain />,
    eyebrow: 'Юр‑ассистент на ваших данных',
    title: 'Спрашивайте по делу — отвечает с цитатами',
    text: 'Загрузите устав, доверенности, переписку — LawTech построит векторный поиск по вашей базе. Юрист задаёт вопрос на естественном языке и получает ответ со ссылками на конкретные документы и пункты.',
    chips: ['Vector search', 'Цитирование источников', 'История запросов', 'Приватный контур'],
  },
];

const bento = [
  { tone: 'blue',   span: 3, icon: <FileSignature />, title: 'Шаблоны договоров',     text: 'Авто‑заполнение по реквизитам клиента и сделки. Контроль обязательных полей перед отправкой.' },
  { tone: 'green',  span: 3, icon: <Bell />,           title: 'Сроки, которые не теряются', text: 'Календарь с автоматическими напоминаниями: суд, продление, оплата. Эскалация при пропуске.' },
  { tone: 'violet', span: 2, icon: <Users2 />,        title: 'Команда и роли',        text: 'Партнёры, юристы, ассистенты — у каждого свой воркспейс и видимые задачи.' },
  { tone: 'amber',  span: 2, icon: <CircleDollarSign />, title: 'Биллинг и выручка',  text: 'Часы, фиксы, постоплата. Прогноз выручки и закрытий по неделям.' },
  { tone: 'blue',   span: 2, icon: <LineChart />,     title: 'Аналитика и отчёты',    text: 'Загрузка юристов, рентабельность дел, узкие места — без ручных таблиц.' },
];

const roles = [
  {
    key: 'lawyer',
    label: 'Юрист',
    icon: <Scale />,
    title: 'Освобождаем 6+ часов в неделю на ручке и поиске',
    text: 'LawTech берёт на себя рутину: анализ договоров, поиск по архиву, генерацию ответов клиенту, ведение карточки дела. Юрист занимается тем, за что ему действительно платят.',
    bullets: [
      ['AI‑анализ договоров с цитатами из текста',  'до 12 минут вместо часа на типовой NDA'],
      ['Векторный поиск по корпоративной базе',     'найти прецедент или старое письмо — секунды'],
      ['Шаблоны и автозаполнение',                   'договоры, претензии, ответы — за пару кликов'],
      ['Карточка дела с историей',                   'весь контекст и переписка в одном месте'],
    ],
    tasks: [
      { done: true,  text: 'Проверить NDA с ООО "Альфа"',          time: '11:24' },
      { done: true,  text: 'Подготовить ответ на претензию',        time: '13:02' },
      { done: false, text: 'Согласовать редакции с партнёром',      time: '15:30' },
      { done: false, text: 'Сдать таймшит за неделю',                time: '17:00' },
    ],
  },
  {
    key: 'partner',
    label: 'Партнёр',
    icon: <Briefcase />,
    title: 'Видите загрузку, выручку и риски в одной панели',
    text: 'Дашборд партнёра без ручных отчётов и сверок. Понятно, где команда буксует, где растёт маржа, какие клиенты съезжают и кто рискует не сдать дело в срок.',
    bullets: [
      ['Загрузка юристов в реальном времени',        'красные зоны видны сразу'],
      ['Прогноз выручки по неделям и кварталам',     'без выгрузки в Excel'],
      ['Здоровье клиентов и риск оттока',            'AI отмечает «тихие» аккаунты'],
      ['Аудит решений и история изменений',          'каждое действие — с пользователем и временем'],
    ],
    tasks: [
      { done: true,  text: 'Дашборд выручки за месяц',              time: '09:00' },
      { done: false, text: 'Ревью загрузки команды',                 time: '10:30' },
      { done: false, text: 'Согласование цены по делу #214',        time: '14:00' },
      { done: false, text: 'Встреча по клиенту "Север"',            time: '16:00' },
    ],
  },
  {
    key: 'ops',
    label: 'Бэк‑офис',
    icon: <Building2 />,
    title: 'Документы, счета и контрагенты — без хаоса',
    text: 'Бэк‑офис ведёт реестры, контрагентов и платежи в едином месте. Чек‑листы запуска нового клиента, контроль реквизитов, выпуск счетов, синхронизация с бухгалтерией.',
    bullets: [
      ['Единый реестр контрагентов с реквизитами',   'KYC и проверка по списку без выхода из системы'],
      ['Чек‑листы запуска проекта',                  'ничего не забыли подписать'],
      ['Версии файлов и согласования',               'кто, когда, что менял'],
      ['Выгрузка для бухгалтерии',                   'счета, акты, ВЗ — в один клик'],
    ],
    tasks: [
      { done: true,  text: 'Выпустить счёт по делу #210',          time: '10:15' },
      { done: true,  text: 'Проверить реквизиты нового клиента',   time: '12:00' },
      { done: false, text: 'Закрыть период за апрель',              time: '15:00' },
      { done: false, text: 'Загрузить акты в 1С',                   time: '17:30' },
    ],
  },
];

const process = [
  { icon: <Layers />,        title: 'Подключаем за день',     text: 'Импорт клиентов, дел и документов из CRM/папок. Без перерыва в работе.' },
  { icon: <BookOpenCheck />, title: 'Учим на ваших шаблонах', text: 'Загружаем «золотые» договоры — LawTech знает, что для вас норма, а что риск.' },
  { icon: <Workflow />,      title: 'Запускаем процессы',     text: 'Включаем напоминания, биллинг, чек‑листы и роли. Адаптируем под команду.' },
  { icon: <Activity />,      title: 'Растём в эффективности', text: 'Через 30 дней — измеримый прирост по скорости и качеству. Отчёт партнёру.' },
];

const stats = [
  { to: 3.8, decimals: 1, suffix: '×',  label: 'быстрее подготовка типовых документов' },
  { to: 92,  decimals: 0, suffix: '%',  label: 'рисков в договорах ловится автоматически' },
  { to: 6,   decimals: 0, suffix: ' ч', label: 'высвобождается у юриста каждую неделю' },
  { to: 38,  decimals: 0, suffix: '%',  label: 'рост выручки без расширения команды' },
];

const reviews = [
  {
    hue: 215,
    quote: 'За первый месяц мы перестали терять дедлайны: уведомления по делу приходят раньше, чем клиент успевает напомнить. Партнёры наконец видят загрузку без таблиц.',
    name: 'Анна К.',
    role: 'Управляющий партнёр, корп. практика',
  },
  {
    hue: 145,
    quote: 'AI‑анализ договора — это не «волшебство», это конкретные пункты с цитатами. Мы убрали 70% ручной правки на типовых NDA и сервисных контрактах.',
    name: 'Дмитрий В.',
    role: 'Senior Counsel, M&A',
  },
  {
    hue: 285,
    quote: 'CRM наконец заговорила на нашем юридическом языке. Карточка дела, биллинг и переписка — всё связано. Бэк‑офис стал тратить в 2 раза меньше времени на отчёты.',
    name: 'Мария С.',
    role: 'Head of Operations',
  },
];

const compareBad = [
  'Договоры лежат в папках и почте — версия теряется',
  'Дедлайны в чатах, ответственность размыта',
  'Биллинг в Excel, ошибки и забытые часы',
  'Аналитика — отчёт раз в месяц, по факту',
  'AI отсутствует или работает «вслепую» без ваших данных',
];
const compareGood = [
  'Один источник правды: карточка дела, версии, цитаты',
  'Сроки в календаре с эскалацией и напоминаниями',
  'Биллинг в системе: часы, фиксы, прогноз выручки',
  'Дашборды в реальном времени по команде и клиентам',
  'AI на ваших шаблонах, в защищённом контуре',
];

const faq = [
  { q: 'Где хранятся наши данные?',
    a: 'В РФ, в защищённом контуре. Шифрование на диске и в канале, ролевой доступ, журнал действий по каждому документу. По запросу — отдельный инстанс под клиента.' },
  { q: 'AI обучается на наших документах?',
    a: 'Только в вашем закрытом контуре. Никаких отправок в публичные модели по умолчанию. Векторная база — приватная, привязана к вашему аккаунту.' },
  { q: 'Сколько времени занимает внедрение?',
    a: 'Базовая настройка — 1 день. Полная адаптация под процессы и шаблоны — 2–3 недели вместе с командой LawTech.' },
  { q: 'Есть ли интеграции с почтой, 1С, ЭДО?',
    a: 'Да. Готовые коннекторы для почты, 1С, основных систем ЭДО и календарей. Остальное — через API.' },
  { q: 'Можно ли начать с одной практики?',
    a: 'Да. Часто стартуем с одной команды (например, корпоративная или M&A) и расширяемся на остальных за 1–2 квартала.' },
  { q: 'Что если нам не подойдёт?',
    a: 'Первые 30 дней — без обязательств. Если не увидите эффекта — возвращаем оплату и помогаем выгрузить ваши данные.' },
];

/* =========================================================================
   COMPONENT
   ========================================================================= */
export default function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeRole, setActiveRole] = useState(0);

  /* Auto‑redirect signed‑in users to /crm (keep prior behavior) */
  useEffect(() => {
    try {
      const tok = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (tok) navigate('/crm', { replace: true });
    } catch { /* noop */ }
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useRevealOnScroll();

  const role = roles[activeRole];

  return (
    <Page>
      {/* ========================= HEADER ========================= */}
      <HeaderWrap scrolled={scrolled}>
        <HeaderInner scrolled={scrolled}>
          <Brand to="/">
            <BrandMark><Scale /></BrandMark>
            LawTech
          </Brand>
          <NavList>
            <NavA href="#product">Продукт</NavA>
            <NavA href="#roles">Для команд</NavA>
            <NavA href="#security">Безопасность</NavA>
            <NavA href="#pricing">Тарифы</NavA>
            <NavA href="#faq">FAQ</NavA>
          </NavList>
          <HeaderActions>
            <ThemeToggle />
            <TextLink href="/auth">Войти</TextLink>
            <PrimaryBtn to="/auth?signup=1">
              Начать <ArrowRight />
            </PrimaryBtn>
          </HeaderActions>
        </HeaderInner>
      </HeaderWrap>

      {/* ========================= HERO ========================= */}
      <HeroWrap>
        <HeroBg />
        <Shell>
          <HeroGrid>
            <div data-reveal>
              <Eyebrow>
                <Sparkles /> AI‑платформа для юридического бизнеса
              </Eyebrow>
              <HeroHeadline>
                Юр<em>фирма</em>,<br />
                которая работает <em>в&nbsp;3.8×</em> быстрее.
              </HeroHeadline>
              <HeroSub>
                LawTech — это <b>CRM, документы и AI‑ассистент в одном контуре</b>.
                Анализ договоров с цитатами, сроки без потерь, биллинг и дашборд партнёра.
                Запускается за день, без миграции «через колено».
              </HeroSub>
              <HeroCTA>
                <PrimaryBtn to="/auth?signup=1">
                  Запросить демо <ArrowRight />
                </PrimaryBtn>
                <GhostBtn to="/auth">
                  <PlayCircle /> Войти в систему
                </GhostBtn>
              </HeroCTA>
              <HeroProof>
                <Stack>
                  <Avatar hue={215} />
                  <Avatar hue={150} />
                  <Avatar hue={280} />
                  <Avatar hue={20} />
                </Stack>
                <div><b>120+ команд</b> уже работают в LawTech</div>
                <div style={{ width: 1, height: 16, background: 'var(--page-border)' }} />
                <RatingRow>
                  <Star /><Star /><Star /><Star /><Star />
                  <span style={{ marginLeft: 6, color: 'var(--page-fg)', fontWeight: 700 }}>4.9 / 5</span>
                </RatingRow>
              </HeroProof>
            </div>

            <DeviceWrap data-reveal>
              <FloatCard top="22px" left="-22px" delay={0}>
                <BadgeCheck />
                <div><strong>Договор проверен</strong><small>18 рисков обработано</small></div>
              </FloatCard>
              <FloatCard right="-14px" top="130px" delay={1.4}>
                <Clock3 />
                <div><strong>Срок через 2 дня</strong><small>уведомление юристу</small></div>
              </FloatCard>
              <FloatCard left="-18px" bottom="64px" delay={2.6}>
                <CircleDollarSign />
                <div><strong>+ ₽420k</strong><small>прогноз выручки</small></div>
              </FloatCard>

              <Device>
                <Dashboard>
                  <DashTop>
                    <WinDots><span /><span /><span /></WinDots>
                    <LiveBadge>AI‑анализ активен</LiveBadge>
                  </DashTop>
                  <DashBody>
                    <SideNav>
                      <SideLabel>Воркспейс</SideLabel>
                      <SideItem active><Briefcase /> Дела</SideItem>
                      <SideItem><Users2 /> Клиенты</SideItem>
                      <SideItem><FileText /> Документы</SideItem>
                      <SideItem><CalendarDays /> Календарь</SideItem>
                      <SideLabel>AI</SideLabel>
                      <SideItem><Brain /> Ассистент</SideItem>
                      <SideItem><Search /> Поиск</SideItem>
                      <SideLabel>Финансы</SideLabel>
                      <SideItem><BarChart3 /> Аналитика</SideItem>
                    </SideNav>
                    <Workspace>
                      <KpiRow>
                        <Kpi>
                          <small>Активные дела</small>
                          <strong>247</strong>
                          <span><TrendingUp size={11} /> +12</span>
                        </Kpi>
                        <Kpi>
                          <small>Закрытие, нед.</small>
                          <strong>₽4.2M</strong>
                          <span><TrendingUp size={11} /> +18%</span>
                        </Kpi>
                        <Kpi>
                          <small>Загрузка</small>
                          <strong>86%</strong>
                          <span><Gauge size={11} /> норма</span>
                        </Kpi>
                      </KpiRow>

                      <ContractCard>
                        <ContractTitle>
                          NDA — ООО «Альфа» × Клиент
                          <small>v3 · обновлено сейчас · 14 страниц</small>
                        </ContractTitle>
                        <Score><span>92</span></Score>
                      </ContractCard>

                      <RiskList>
                        <RiskItem tone="high"><i /><span>Односторонний выход без компенсации (п.&nbsp;7.4)</span><small>High</small></RiskItem>
                        <RiskItem tone="med"><i /><span>Срок ответа на претензию 5 дней — короче эталона</span><small>Medium</small></RiskItem>
                        <RiskItem tone="low"><i /><span>Подсудность совпадает с шаблоном</span><small>OK</small></RiskItem>
                      </RiskList>

                      <AskAi>
                        <Bot />
                        <div>«Найди все пункты про конфиденциальность и сравни с эталоном»<span className="cursor" /></div>
                      </AskAi>
                    </Workspace>
                  </DashBody>
                </Dashboard>
              </Device>
            </DeviceWrap>
          </HeroGrid>

        </Shell>
      </HeroWrap>

      {/* ========================= PRODUCT SHOWCASE ========================= */}
      <Section id="product">
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><Layers /> Продукт</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Три слоя, которые работают <em>как один</em>
              </SectionTitle>
            </div>
            <SectionHeadAside>
              CRM, документооборот и AI‑ассистент — связаны на уровне данных. Никаких «вкладок без общего контекста».
            </SectionHeadAside>
          </SectionHead>

          <Showcase>
            {showcase.map((s, i) => (
              <ShowRow key={s.title} reverse={i % 2 === 1} data-reveal>
                <div className="copy">
                  <ShowCopy>
                    <SectionIcon>{s.icon}</SectionIcon>
                    <Eyebrow style={{ marginTop: 16 }}>{s.eyebrow}</Eyebrow>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <ShowChips>
                      {s.chips.map((c) => <Chip key={c}><Check />{c}</Chip>)}
                    </ShowChips>
                  </ShowCopy>
                </div>
                <div className="visual">
                  <ShowVisual>
                    {i === 0 && (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <DashTop>
                          <WinDots><span /><span /><span /></WinDots>
                          <LiveBadge>AI</LiveBadge>
                        </DashTop>
                        <ContractCard>
                          <ContractTitle>Сервисный договор · v2<small>14 стр · 18 рисков</small></ContractTitle>
                          <Score><span>87</span></Score>
                        </ContractCard>
                        <RiskList>
                          <RiskItem tone="high"><i /><span>Безусловная индемнизация на стороне исполнителя</span><small>High</small></RiskItem>
                          <RiskItem tone="med"><i /><span>SLA 99.9% без штрафных рамок</span><small>Med</small></RiskItem>
                          <RiskItem tone="med"><i /><span>Ограничение ответственности — отсутствует</span><small>Med</small></RiskItem>
                          <RiskItem tone="low"><i /><span>Подсудность РФ — совпадает с эталоном</span><small>OK</small></RiskItem>
                        </RiskList>
                      </div>
                    )}
                    {i === 1 && (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <DashTop>
                          <WinDots><span /><span /><span /></WinDots>
                          <LiveBadge>CRM</LiveBadge>
                        </DashTop>
                        <KpiRow>
                          <Kpi><small>Дела</small><strong>247</strong><span><TrendingUp size={11} /> +12</span></Kpi>
                          <Kpi><small>Выручка / нед.</small><strong>₽4.2M</strong><span><TrendingUp size={11} /> +18%</span></Kpi>
                          <Kpi><small>Дедлайны</small><strong>0</strong><span><Check size={11} /> просрочек</span></Kpi>
                        </KpiRow>
                        <ContractCard>
                          <ContractTitle>Клиент: ООО «Север»<small>3 активных дела · ₽1.2M в работе</small></ContractTitle>
                          <Score><span>A+</span></Score>
                        </ContractCard>
                        <RiskList>
                          <RiskItem tone="low"><i /><span>Договор #214 — подписан, оплата ожидается</span><small>Trk</small></RiskItem>
                          <RiskItem tone="med"><i /><span>Иск #88 — заседание через 6 дней</span><small>Soon</small></RiskItem>
                          <RiskItem tone="low"><i /><span>NDA продлён до 31.12</span><small>OK</small></RiskItem>
                        </RiskList>
                      </div>
                    )}
                    {i === 2 && (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <DashTop>
                          <WinDots><span /><span /><span /></WinDots>
                          <LiveBadge>Ask AI</LiveBadge>
                        </DashTop>
                        <AskAi>
                          <MessageSquare />
                          <div>Юрист: «Найди все упоминания неустойки и сравни ставки в действующих договорах с клиентом А.»</div>
                        </AskAi>
                        <ContractCard>
                          <ContractTitle>Ответ ассистента<small>3 документа · 6 цитат · 0.4 c</small></ContractTitle>
                          <Score><span>AI</span></Score>
                        </ContractCard>
                        <RiskList>
                          <RiskItem tone="low"><i /><span>Договор от 14.02 — неустойка 0.1% / день, п. 8.2</span><small>cite</small></RiskItem>
                          <RiskItem tone="med"><i /><span>Доп. соглашение №3 — 0.5% / день, п. 4</span><small>cite</small></RiskItem>
                          <RiskItem tone="low"><i /><span>NDA — раздел о неустойке отсутствует</span><small>note</small></RiskItem>
                        </RiskList>
                      </div>
                    )}
                  </ShowVisual>
                </div>
              </ShowRow>
            ))}
          </Showcase>
        </Shell>
      </Section>

      {/* ========================= BENTO ========================= */}
      <Section>
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><Sparkles /> Возможности</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Всё, что нужно команде — <em>в одном месте</em>
              </SectionTitle>
            </div>
            <SectionHeadAside>
              От шаблонов и сроков до биллинга и аналитики. Без зоопарка из 7 SaaS‑ов и Excel‑файлов.
            </SectionHeadAside>
          </SectionHead>

          <Bento>
            {bento.map((b, i) => (
              <Cell key={b.title} span={b.span as number} data-reveal>
                <CellIcon tone={b.tone as any}>{b.icon}</CellIcon>
                <h4>{b.title}</h4>
                <p>{b.text}</p>
              </Cell>
            ))}
          </Bento>
        </Shell>
      </Section>

      {/* ========================= ROLES ========================= */}
      <Section id="roles">
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><Users2 /> Для разных ролей в команде</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Один продукт. <em>Три ракурса</em>.
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Юристы, партнёры и бэк‑офис видят свой контекст, не мешая друг другу. Контроль доступа на уровне поля.
            </SectionHeadAside>
          </SectionHead>

          <Tabs data-reveal>
            {roles.map((r, idx) => (
              <Tab key={r.key} active={activeRole === idx} onClick={() => setActiveRole(idx)}>
                {r.icon} {r.label}
              </Tab>
            ))}
          </Tabs>

          <RolePanel data-reveal>
            <RoleCopy>
              <h3>{role.title}</h3>
              <p>{role.text}</p>
              <RoleList>
                {role.bullets.map(([head, sub]) => (
                  <li key={head}>
                    <span><Check /></span>
                    <div><b>{head}.</b><em style={{ color: 'var(--page-muted)', fontStyle: 'normal' }}>{sub}</em></div>
                  </li>
                ))}
              </RoleList>
              <div style={{ marginTop: 28 }}>
                <PrimaryBtn to="/auth?signup=1">Запросить демо для {role.label.toLowerCase()}а <ArrowUpRight /></PrimaryBtn>
              </div>
            </RoleCopy>
            <RoleVisual>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <strong style={{ fontSize: 14, letterSpacing: '-0.01em' }}>Сегодня · план дня</strong>
                <LiveBadge style={{ color: '#065f46' as any }}>{role.label}</LiveBadge>
              </div>
              {role.tasks.map((t) => (
                <TaskRow key={t.text}>
                  <TaskCheck done={t.done}>{t.done ? <Check /> : null}</TaskCheck>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    textDecoration: t.done ? 'line-through' : 'none',
                    color: t.done ? 'var(--page-muted)' : 'var(--page-fg)',
                  }}>{t.text}</div>
                  <small>{t.time}</small>
                </TaskRow>
              ))}
            </RoleVisual>
          </RolePanel>
        </Shell>
      </Section>

      {/* ========================= COMPARISON ========================= */}
      <Section>
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><GitBranch /> Сравнение</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                До LawTech и <em>с</em> LawTech
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Знакомые сценарии в обычной практике — и как они меняются после внедрения. Без воды.
            </SectionHeadAside>
          </SectionHead>

          <Compare>
            <ComparePane data-reveal>
              <header>
                <AlertTriangle size={16} color="#ef4444" />
                <strong>До</strong>
              </header>
              <h3>Папки, чаты и Excel</h3>
              <CompareList>
                {compareBad.map((t) => (
                  <li key={t} className="bad"><span><X /></span><div>{t}</div></li>
                ))}
              </CompareList>
            </ComparePane>
            <ComparePane good data-reveal>
              <header>
                <Zap size={16} color="#2563eb" />
                <strong>С LawTech</strong>
              </header>
              <h3>Единый контур и AI на ваших данных</h3>
              <CompareList>
                {compareGood.map((t) => (
                  <li key={t} className="good"><span><Check /></span><div>{t}</div></li>
                ))}
              </CompareList>
            </ComparePane>
          </Compare>
        </Shell>
      </Section>

      {/* ========================= STATS ========================= */}
      <Section>
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><TrendingUp /> Эффект</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Цифры, которые видит <em>партнёр</em>
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Усреднённые показатели команд из 8–150 юристов через 90 дней после внедрения.
            </SectionHeadAside>
          </SectionHead>

          <StatsGrid>
            {stats.map((s, i) => (
              <StatCard key={s.label} data-reveal>
                <strong><Counter to={s.to} decimals={s.decimals} suffix={s.suffix} duration={1200 + i * 200} /></strong>
                <small>{s.label}</small>
              </StatCard>
            ))}
          </StatsGrid>
        </Shell>
      </Section>

      {/* ========================= TESTIMONIALS ========================= */}
      <Section>
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><Quote /> Отзывы</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Команды, которые <em>не вернутся</em> к Excel
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Анонимизировано по запросу клиентов. Полные кейсы — высылаем партнёрам по запросу.
            </SectionHeadAside>
          </SectionHead>

          <Testimonials>
            {reviews.map((r) => (
              <TQuote key={r.name} data-reveal>
                <Quote />
                <blockquote>«{r.quote}»</blockquote>
                <figcaption>
                  <Avatar hue={r.hue} />
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.role}</span>
                  </div>
                </figcaption>
              </TQuote>
            ))}
          </Testimonials>
        </Shell>
      </Section>

      {/* ========================= PROCESS ========================= */}
      <Section>
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><Workflow /> Как внедряем</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                4 шага. <em>30 дней</em>. Без боли.
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Команда LawTech ведёт внедрение «под ключ»: вы остаётесь в продуктивной работе, мы — настраиваем.
            </SectionHeadAside>
          </SectionHead>

          <Steps>
            {process.map((s) => (
              <Step key={s.title} data-reveal>
                <SectionIcon>{s.icon}</SectionIcon>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </Step>
            ))}
          </Steps>
        </Shell>
      </Section>

      {/* ========================= SECURITY ========================= */}
      <Section id="security" style={{ padding: '40px 0' }}>
        <Sec>
          <Shell>
            <SecGrid>
              <div data-reveal>
                <Eyebrow style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.10)' }}>
                  <ShieldCheck /> Безопасность и приватность
                </Eyebrow>
                <SectionTitle style={{ marginTop: 18, color: 'white' }}>
                  Ваш AI <em>в&nbsp;вашем</em> контуре
                </SectionTitle>
                <p style={{ marginTop: 18, color: 'rgba(203,213,225,0.85)', fontSize: 17, lineHeight: 1.6, maxWidth: 520 }}>
                  Данные хранятся в РФ. Шифрование at rest и in transit. Ролевой доступ, журнал действий,
                  отдельный инстанс по запросу. AI работает на вашей базе и <b style={{ color: 'white' }}>никогда не уходит наружу</b>.
                </p>
                <SecBadges>
                  <SecBadge><span><ShieldCheck /></span><div><strong>ФЗ‑152</strong><small>Персональные данные · РФ</small></div></SecBadge>
                  <SecBadge><span><Lock /></span><div><strong>AES‑256</strong><small>Шифрование at rest</small></div></SecBadge>
                  <SecBadge><span><KeyRound /></span><div><strong>SSO / MFA</strong><small>OIDC, SAML, TOTP</small></div></SecBadge>
                  <SecBadge><span><Database /></span><div><strong>Аудит‑лог</strong><small>Кто, что, когда</small></div></SecBadge>
                </SecBadges>
              </div>

              <Vault data-reveal>
                <Ring>
                  <Lockey><ShieldCheck /></Lockey>
                  <Orbit angle={0} r={120} delay={0}><span><Server /></span></Orbit>
                  <Orbit angle={72} r={120} delay={0.6}><span><Database /></span></Orbit>
                  <Orbit angle={144} r={120} delay={1.2}><span><KeyRound /></span></Orbit>
                  <Orbit angle={216} r={120} delay={1.8}><span><Cpu /></span></Orbit>
                  <Orbit angle={288} r={120} delay={2.4}><span><Activity /></span></Orbit>
                </Ring>
                <div style={{ textAlign: 'center', marginTop: 20, color: 'rgba(203,213,225,0.85)', fontSize: 13.5 }}>
                  Замкнутый контур: данные, AI и аудит — в одной защищённой зоне.
                </div>
              </Vault>
            </SecGrid>
          </Shell>
        </Sec>
      </Section>

      {/* ========================= PRICING ========================= */}
      <Section id="pricing">
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><CircleDollarSign /> Тарифы</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Прозрачно. <em>По людям</em>. Без сюрпризов.
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Платите за активных пользователей. AI‑ассистент и аналитика — во всех тарифах.
            </SectionHeadAside>
          </SectionHead>

          <PriceGrid>
            <PriceCard data-reveal>
              <h3>Старт</h3>
              <p className="desc">Для практики до 8 юристов</p>
              <PriceTag><span className="num">₽3 900</span><span className="per">/ юрист, мес.</span></PriceTag>
              <Feats>
                <li><Check color="#059669" /><div>CRM, документы, календарь</div></li>
                <li><Check color="#059669" /><div>AI‑анализ договоров (до 100 / мес.)</div></li>
                <li><Check color="#059669" /><div>Векторный поиск по базе</div></li>
                <li><Check color="#059669" /><div>Базовый биллинг и отчёты</div></li>
                <li><Check color="#059669" /><div>Email‑поддержка</div></li>
              </Feats>
              <GhostBtn to="/auth?signup=1">Начать <ArrowRight /></GhostBtn>
            </PriceCard>

            <PriceCard featured data-reveal>
              <FeaturedBadge><Star /> Лучший выбор</FeaturedBadge>
              <h3>Практика</h3>
              <p className="desc">Для команд 8–40 юристов и партнёров</p>
              <PriceTag featured><span className="num">₽6 500</span><span className="per">/ юрист, мес.</span></PriceTag>
              <Feats>
                <li><Check color="#34d399" /><div>Всё из «Старт»</div></li>
                <li><Check color="#34d399" /><div>AI‑анализ без лимитов + редакторские правки</div></li>
                <li><Check color="#34d399" /><div>Биллинг, прогноз выручки, дашборд партнёра</div></li>
                <li><Check color="#34d399" /><div>SSO, ролевой доступ, аудит‑лог</div></li>
                <li><Check color="#34d399" /><div>Интеграции: 1С, ЭДО, почта, календари</div></li>
                <li><Check color="#34d399" /><div>Выделенный менеджер успеха</div></li>
              </Feats>
              <WhiteBtn to="/auth?signup=1">Запросить демо <ArrowRight /></WhiteBtn>
            </PriceCard>

            <PriceCard data-reveal>
              <h3>Enterprise</h3>
              <p className="desc">Для фирм 40+ и in‑house подразделений</p>
              <PriceTag><span className="num">Индив.</span></PriceTag>
              <Feats>
                <li><Check color="#059669" /><div>Всё из «Практика»</div></li>
                <li><Check color="#059669" /><div>Отдельный инстанс / on‑prem</div></li>
                <li><Check color="#059669" /><div>Кастомные интеграции и шаблоны</div></li>
                <li><Check color="#059669" /><div>SLA 99.9% и приоритетная поддержка</div></li>
                <li><Check color="#059669" /><div>Юридическое сопровождение внедрения</div></li>
              </Feats>
              <GhostBtn to="/auth?signup=1">Обсудить <ArrowUpRight /></GhostBtn>
            </PriceCard>
          </PriceGrid>
        </Shell>
      </Section>

      {/* ========================= FAQ ========================= */}
      <Section id="faq">
        <Shell>
          <SectionHead data-reveal>
            <div>
              <Eyebrow><ListChecks /> Частые вопросы</Eyebrow>
              <SectionTitle style={{ marginTop: 18 }}>
                Отвечаем <em>прямо</em>
              </SectionTitle>
            </div>
            <SectionHeadAside>
              Не нашли ответа? Напишите — пришлём подробный материал или организуем созвон с архитектором.
            </SectionHeadAside>
          </SectionHead>

          <FaqList>
            {faq.map((f, i) => (
              <FaqItem key={f.q} data-reveal open={i === 0}>
                <summary>
                  <span>{f.q}</span>
                  <span className="chev"><Plus size={14} /></span>
                </summary>
                <div className="body">{f.a}</div>
              </FaqItem>
            ))}
          </FaqList>
        </Shell>
      </Section>

      {/* ========================= FINAL CTA ========================= */}
      <Section>
        <Shell>
          <FinalCta data-reveal>
            <Eyebrow style={{ background: 'rgba(255,255,255,0.08)', color: 'white', borderColor: 'rgba(255,255,255,0.18)' }}>
              <Sparkles /> Готовы попробовать?
            </Eyebrow>
            <h2 style={{ marginTop: 18 }}>
              Заберите <em>6 часов в неделю</em>,<br />
              которые сейчас уходят в Excel и чаты.
            </h2>
            <p>
              30 минут демо — покажем на вашем кейсе. Подключение за день. Первые 30 дней — без обязательств.
            </p>
            <FinalActions>
              <WhiteBtn to="/auth?signup=1">Запросить демо <ArrowRight /></WhiteBtn>
              <OutlineWhite href="mailto:hello@lawtech.ru"><Mail /> hello@lawtech.ru</OutlineWhite>
            </FinalActions>
          </FinalCta>
        </Shell>
      </Section>

      {/* ========================= FOOTER ========================= */}
      <Shell>
        <FooterWrap>
          <FootGrid>
            <div>
              <Brand to="/" style={{ fontSize: 19 }}>
                <BrandMark><Scale /></BrandMark>
                LawTech
              </Brand>
              <p style={{ marginTop: 14, color: 'var(--page-muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
                AI‑платформа для юридического бизнеса. CRM, документы и AI‑ассистент в одном защищённом контуре.
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 18, color: 'var(--page-muted)', fontSize: 13 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> Москва, РФ</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Globe2 size={14} /> lawtech.ru</span>
              </div>
            </div>
            <FootCol>
              <h5>Продукт</h5>
              <ul>
                <li><a href="#product">CRM и документы</a></li>
                <li><a href="#product">AI‑анализ договоров</a></li>
                <li><a href="#product">Юр‑ассистент</a></li>
                <li><a href="#pricing">Тарифы</a></li>
              </ul>
            </FootCol>
            <FootCol>
              <h5>Команды</h5>
              <ul>
                <li><a href="#roles">Юристы</a></li>
                <li><a href="#roles">Партнёры</a></li>
                <li><a href="#roles">Бэк‑офис</a></li>
                <li><a href="#security">In‑house</a></li>
              </ul>
            </FootCol>
            <FootCol>
              <h5>Компания</h5>
              <ul>
                <li><a href="#">О нас</a></li>
                <li><a href="#security">Безопасность</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="mailto:hello@lawtech.ru">Контакты</a></li>
              </ul>
            </FootCol>
            <FootCol>
              <h5>Документы</h5>
              <ul>
                <li><a href="#">Политика конфиденциальности</a></li>
                <li><a href="#">Условия использования</a></li>
                <li><a href="#">Обработка ПДн</a></li>
                <li><a href="#">DPA</a></li>
              </ul>
            </FootCol>
          </FootGrid>
          <FootBottom>
            <div>© {new Date().getFullYear()} LawTech. Все права защищены.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} color="#10b981" /> ФЗ‑152</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="#10b981" /> AES‑256</span>
            </div>
          </FootBottom>
        </FooterWrap>
      </Shell>
    </Page>
  );
}
