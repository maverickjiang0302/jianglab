/*
  LCA Calculator Dataset — Jiang Lab
  ====================================
  Update the factor values and items below to match your specific study.

  Structure:
    category → items → { id, name, hint, unit, factor, factorUnit }
    factor: the emission/impact factor per 1 unit of the input
    factorUnit: label shown in the UI for the factor

  meta.unit: the unit displayed for the total result (e.g. "kg CO₂-eq / m³")
  meta.functionalUnit: description of what the result is "per"
*/

const LCA_DATA = {
  meta: {
    title: "Electro-Microbial Water Treatment",
    functionalUnit: "per m³ of treated water",
    impactCategory: "Global Warming Potential",
    unit: "kg CO₂-eq / m³"
  },
  categories: [
    {
      id: "energy",
      name: "Energy Consumption",
      items: [
        {
          id: "aeration_elec",
          name: "Aeration (blowers)",
          hint: "Electricity for biological aeration",
          unit: "kWh",
          factor: 0.386,
          factorUnit: "kg CO₂-eq / kWh"
        },
        {
          id: "electrochemical_elec",
          name: "Electrochemical system",
          hint: "Electricity for bio-electrochemical treatment",
          unit: "kWh",
          factor: 0.386,
          factorUnit: "kg CO₂-eq / kWh"
        },
        {
          id: "pumping_elec",
          name: "Pumping & conveyance",
          hint: "Electricity for water pumping",
          unit: "kWh",
          factor: 0.386,
          factorUnit: "kg CO₂-eq / kWh"
        }
      ]
    },
    {
      id: "chemicals",
      name: "Chemical Inputs",
      items: [
        {
          id: "methanol",
          name: "Methanol (carbon source)",
          hint: "External carbon for denitrification",
          unit: "g",
          factor: 0.00229,
          factorUnit: "kg CO₂-eq / g"
        },
        {
          id: "naoh",
          name: "Sodium hydroxide (NaOH)",
          hint: "For pH adjustment",
          unit: "g",
          factor: 0.00145,
          factorUnit: "kg CO₂-eq / g"
        },
        {
          id: "h2so4",
          name: "Sulfuric acid (H₂SO₄)",
          hint: "For pH adjustment",
          unit: "g",
          factor: 0.00088,
          factorUnit: "kg CO₂-eq / g"
        }
      ]
    },
    {
      id: "materials",
      name: "Materials & Infrastructure",
      items: [
        {
          id: "membrane",
          name: "Membrane modules",
          hint: "Amortized over system lifetime",
          unit: "m²",
          factor: 8.1,
          factorUnit: "kg CO₂-eq / m²"
        },
        {
          id: "electrode",
          name: "Electrode materials",
          hint: "Carbon-based electrodes (amortized)",
          unit: "g",
          factor: 0.00210,
          factorUnit: "kg CO₂-eq / g"
        }
      ]
    },
    {
      id: "transport",
      name: "Transportation",
      items: [
        {
          id: "sludge_transport",
          name: "Sludge transport",
          hint: "Truck transport of dewatered sludge",
          unit: "tonne-km",
          factor: 0.062,
          factorUnit: "kg CO₂-eq / tonne-km"
        },
        {
          id: "chemical_transport",
          name: "Chemical delivery",
          hint: "Freight delivery of chemicals",
          unit: "tonne-km",
          factor: 0.051,
          factorUnit: "kg CO₂-eq / tonne-km"
        }
      ]
    }
  ]
};
