import React, { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

const TrustDonut: React.FC = () => {
  const options: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 420,
      width: 420,
    },
    title: { text: '' },
    tooltip: { valueSuffix: '%', style: { fontSize: '11px' } },
    plotOptions: {
      pie: {
        borderWidth: 2,
        borderColor: '#ffffff',
        shadow: false,
      }
    },
    credits: { enabled: false },
    series: [{
      type: 'pie',
      name: 'Weight',
      innerSize: '68%',
      borderRadius: 6,
      dataLabels: [{
        enabled: true,
        format: '{point.name}',
        style: { color: '#94A3B8', fontSize: '9px', fontFamily: 'JetBrains Mono', fontWeight: '500', textOutline: 'none' },
        distance: 12,
      }],
      data: [
        { name: 'Behavioral', y: 40, color: '#10B981' },
        { name: 'Device', y: 20, color: '#3B82F6' },
        { name: 'Transaction', y: 20, color: '#F59E0B' },
        { name: 'Cognitive', y: 20, color: '#8B5CF6' },
      ],
    }],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', marginTop: -8 }}>
        T(t) WEIGHT DISTRIBUTION
      </div>
    </div>
  )
}

export default TrustDonut
