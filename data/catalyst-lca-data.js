/*
  Catalyst LCA Dataset — Jiang Lab
  ================================
  Zeolite Beta (H-form) synthesis, three routes. Functional unit: 1 kg zeolite Beta.

  Factor sourcing:
    "GREET"      — Argonne GREET 2025 Rev.1 / GREET2 / GREET Building module (cradle-to-gate, kg CO2e/kg or kg CO2e/kWh)
    "GREET+IPCC" — GREET upstream fuel factor + IPCC/EPA standard combustion factor (GREET's fuel factors exclude end-use combustion)
    "Manuscript" — Table 2, cradle-to-gate factors (ecoinvent-3.7-derived) from the source zeolite-Beta LCA manuscript.
      GREET has no factor for these — they are specialty synthesis reagents (organic template, metal-alkoxide/aluminate
      precursors) outside GREET's fuels/bulk-materials scope.

  Each route lists only the inputs relevant to that synthesis pathway, grouped into sections.
  Quantities are left at 0 for the user to enter (kg or kWh or MJ per kg zeolite product), except
  ion-exchange salt, which is pre-filled with the manuscript's own baseline dosing as a starting point.
*/

const CATALYST_LCA_DATA = {
  routes: [
    {
      id: "ch",
      label: "Conventional Hydrothermal (CH)",
      description: "NaOH + aqueous TEAOH + colloidal silica + aluminum isopropoxide, crystallized 140°C/7 days, ion-exchanged (NH₄NO₃) to H-form.",
      manuscriptBenchmark: 26.9,
      sections: [
        {
          name: "Energy",
          items: [
            { id: "ch_elec", label: "Electricity", unit: "kWh", factor: 0.397, source: "GREET", note: "US average grid mix", defaultQty: 0 },
            { id: "ch_ng", label: "Natural gas (process heat)", unit: "MJ", factor: 0.0678, source: "GREET+IPCC", note: "0.0175 upstream (GREET) + 0.0503 combustion (EPA/IPCC, HHV)", defaultQty: 0, heatHelper: true }
          ]
        },
        {
          name: "Silica & Alumina Source",
          items: [
            { id: "ch_silica", label: "Colloidal silica", unit: "kg", factor: 1.648, source: "Manuscript", note: "No GREET factor for colloidal silica", defaultQty: 0 },
            { id: "ch_alox", label: "Aluminum isopropoxide", unit: "kg", factor: 4.43, source: "Manuscript", note: "No GREET factor for this precursor", defaultQty: 0 }
          ]
        },
        {
          name: "Template (OSDA)",
          items: [
            { id: "ch_teaoh", label: "TEAOH (35% solution)", unit: "kg", factor: 1.11, source: "Manuscript", note: "No GREET factor for TEAOH", defaultQty: 0 }
          ]
        },
        {
          name: "Synthesis Base",
          items: [
            { id: "ch_naoh", label: "Sodium hydroxide", unit: "kg", factor: 1.903, source: "GREET", note: "GREET1 secondary input export", defaultQty: 0 }
          ]
        },
        {
          name: "Ion Exchange (use one salt)",
          items: [
            { id: "ch_nh4no3", label: "Ammonium nitrate", unit: "kg", factor: 2.213, source: "GREET", note: "Baseline dosing: ~6.4 kg/kg at 2N per patent protocol", defaultQty: 6.4 },
            { id: "ch_nh4cl", label: "Ammonium chloride (alt.)", unit: "kg", factor: 0.433, source: "GREET", note: "Use instead of nitrate if applicable", defaultQty: 0 },
            { id: "ch_nh4so4", label: "Ammonium sulfate (alt.)", unit: "kg", factor: 0.690, source: "GREET", note: "Use instead of nitrate if applicable", defaultQty: 0 }
          ]
        }
      ]
    },
    {
      id: "dgc",
      label: "Dry Gel Conversion (DGC)",
      description: "Al₂(SO₄)₃ + TEAOH + colloidal silica, dried, crystallized 175°C/1 day, calcined directly to H-form — no ion exchange step.",
      manuscriptBenchmark: 14.8,
      sections: [
        {
          name: "Energy",
          items: [
            { id: "dgc_elec", label: "Electricity", unit: "kWh", factor: 0.397, source: "GREET", note: "US average grid mix", defaultQty: 0 },
            { id: "dgc_ng", label: "Natural gas (process heat)", unit: "MJ", factor: 0.0678, source: "GREET+IPCC", note: "0.0175 upstream (GREET) + 0.0503 combustion (EPA/IPCC, HHV)", defaultQty: 0, heatHelper: true }
          ]
        },
        {
          name: "Silica & Alumina Source",
          items: [
            { id: "dgc_silica", label: "Colloidal silica", unit: "kg", factor: 1.648, source: "Manuscript", note: "No GREET factor for colloidal silica", defaultQty: 0 },
            { id: "dgc_alsulf", label: "Aluminum sulfate", unit: "kg", factor: 0.497, source: "GREET", note: "Direct GREET match — DGC's actual alumina source", defaultQty: 0 }
          ]
        },
        {
          name: "Template (OSDA)",
          items: [
            { id: "dgc_teaoh", label: "TEAOH (35% solution)", unit: "kg", factor: 1.11, source: "Manuscript", note: "No GREET factor for TEAOH — dominant driver of this route's footprint", defaultQty: 0 }
          ]
        }
      ]
    },
    {
      id: "sof",
      label: "Solvent / OSDA-free (SOF)",
      description: "Solid hydrated silica + sodium aluminate + NaOH + Beta seed crystals, ground (no solvent, no organic template), crystallized 120°C/9 days, ion-exchanged to H-form.",
      manuscriptBenchmark: 13.9,
      sections: [
        {
          name: "Energy",
          items: [
            { id: "sof_elec", label: "Electricity", unit: "kWh", factor: 0.397, source: "GREET", note: "US average grid mix", defaultQty: 0 },
            { id: "sof_ng", label: "Natural gas (process heat)", unit: "MJ", factor: 0.0678, source: "GREET+IPCC", note: "0.0175 upstream (GREET) + 0.0503 combustion (EPA/IPCC, HHV)", defaultQty: 0, heatHelper: true }
          ]
        },
        {
          name: "Silica & Alumina Source",
          items: [
            { id: "sof_silica", label: "Solid hydrated silica", unit: "kg", factor: 1.648, source: "Manuscript", note: "Colloidal-silica factor used as closest proxy", defaultQty: 0 },
            { id: "sof_naaluminate", label: "Sodium aluminate", unit: "kg", factor: 3.076, source: "Manuscript", note: "No GREET factor for sodium aluminate", defaultQty: 0 }
          ]
        },
        {
          name: "Synthesis Base",
          items: [
            { id: "sof_naoh", label: "Sodium hydroxide", unit: "kg", factor: 1.903, source: "GREET", note: "GREET1 secondary input export", defaultQty: 0 }
          ]
        },
        {
          name: "Ion Exchange (use one salt)",
          items: [
            { id: "sof_nh4no3", label: "Ammonium nitrate", unit: "kg", factor: 2.213, source: "GREET", note: "Baseline dosing: ~3.2 kg/kg at 1M", defaultQty: 3.2 },
            { id: "sof_nh4cl", label: "Ammonium chloride (alt.)", unit: "kg", factor: 0.433, source: "GREET", note: "Use instead of nitrate if applicable", defaultQty: 0 },
            { id: "sof_nh4so4", label: "Ammonium sulfate (alt.)", unit: "kg", factor: 0.690, source: "GREET", note: "Use instead of nitrate if applicable", defaultQty: 0 }
          ]
        }
      ]
    }
  ]
};
