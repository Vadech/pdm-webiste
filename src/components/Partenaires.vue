<template>
    <div>

        <el-container>
            <!-- <el-header></el-header> -->
            <el-main>
                <div id="graph"></div>
            </el-main>
            <el-footer height="40">
                <el-row :gutter="0" justify="space-between">
                    <el-col :span="4">
                        <div class="grid-content" />
                        <el-switch v-model="showLinks" @click="changeState()" active-text="Connexions" />
                    </el-col>
                    <el-col :span="4">
                        <div class="grid-content" />
                        <el-switch v-model="withPDM" @click="changeState()" active-text="PDM" />
                    </el-col>
                    <el-col :span="4">
                        <div class="grid-content" />
                        <el-switch v-model="grouped" @click="changeState()" active-text="Par type" />
                    </el-col>
                    <el-col :span="4">
                        <div class="grid-content" />
                        <el-switch v-model="onlySynapse" @click="changeState()" active-text="Synapse" />
                    </el-col>
                    <el-col :span="4">
                        <div class="grid-content" />
                        <el-switch v-model="cleanPresentation" @click="changeState()" active-text="En cercle" />
                    </el-col>
                </el-row>
            </el-footer>
        </el-container>
    </div>
</template>

<script>
import * as echarts from 'echarts'
import { unique, flat } from 'radash'

export default {
    name: 'myGraph',
    data() {
        return {
            cleanPresentation: false,
            grouped: false,
            onlySynapse: false,
            withPDM: false,
            showLinks: false,
            chart: null,
            data: null
        }
    },
    mounted() {
        var chartDom = document.getElementById('graph')
        this.chart = echarts.init(chartDom) //, null, { renderer: 'svg' })

        this.chart.showLoading()

        // get file content data
        fetch('/data.json')
            .then(response => response.json())
            .then(data => {
                this.data = data
                this.chart.setOption(this.getOption())
            })

        this.chart.hideLoading()
    },
    methods: {
        changeState() {
            this.chart.setOption(this.getOption())
        },
        getOption() {
            let tmpData = JSON.parse(JSON.stringify(this.data))

            if (this.onlySynapse) {
                tmpData = tmpData.filter(f => f.synapse === true)
            }

            if (this.grouped) {
                let groups = unique(tmpData, f => f.category).map(f => ({
                    "name": f.category
                }))

                let groupsData = []

                groups.forEach(f => {
                    groupsData.push({
                        "name": f.name,
                        "category": f.name,
                        "symbolSize": 40,
                        "synapse": true,
                        "links": f.name === 'PMS' ? tmpData.map(g => g.category) : ['PMS']
                    })
                })

                tmpData = groupsData

                tmpData.push({
                    "name": "BI",
                    "category": "group",
                    "symbolSize": 20,
                    "synapse": true,
                    "links": ["Chaîne"]
                })
                tmpData.push({
                    "name": "FID",
                    "category": "group",
                    "symbolSize": 20,
                    "synapse": true,
                    "links": ["Chaîne"]
                })
            }

            let PMSs = tmpData.filter(f => f.category === 'PMS').map(f => f.name)
            // let RMSs = tmpData.filter(f => f.category === 'RMS').map(f => f.name)
            // let CMs = tmpData.filter(f => f.category === 'CM').map(f => f.name)
            if (this.withPDM) {
                tmpData = tmpData.map(f => {
                    f.links = f.links.filter(g => !PMSs.includes(g))
                    if (f.category !== 'PMS') {
                        f.links.push('PDM')
                    } else {
                        // f.links = [...f.links, ...RMSs, ...CMs]
                    }
                    return f
                })
                tmpData.push({
                    "name": "PDM",
                    "category": "PDM",
                    "symbolSize": 80,
                    "synapse": true,
                    "links": PMSs
                })
                tmpData.push({
                    "name": "Chaîne",
                    "category": "group",
                    "symbolSize": 50,
                    "synapse": true,
                    "links": ["PDM", "CRM"]
                })
            } else {
                tmpData.push({
                    "name": "Chaîne",
                    "category": "group",
                    "symbolSize": 50,
                    "synapse": true,
                    "links": ["PMS", "CM", "CRM"]
                })
            }

            if (!this.showLinks) {
                tmpData = tmpData.map(f => {
                    f.links = []
                    return f
                })
            }

            return {
                legend: {
                    data: unique(tmpData, f => f.category).map(f => f.category),
                    // selected: {
                    //   'Serrures': false,
                    //   'Marketing': false,
                    // }
                },
                series: [
                    {
                        type: 'graph',
                        layout: this.cleanPresentation ? 'circular' : "force",
                        force: {
                            initLayout: this.showLinks ? 'circular' : 'none',
                            edgeLength: 300,
                            repulsion: 300,
                            gravity: .1,
                            friction: .2,
                        },
                        animation: true,
                        animationDurationUpdate: 1000,
                        animationEasingUpdate: 'quinticInOut',
                        roam: false,
                        edgeSymbol: ['arrow', 'none'],
                        edgeSymbolSize: [10, 0],
                        label: {
                            show: true,
                            position: 'top',
                            formatter: '{b}'
                        },
                        draggable: true,
                        lineStyle: {
                            color: 'source',
                            type: 'dashed',
                            curveness: 0.05
                        },
                        emphasis: {
                            focus: 'adjacency',
                            label: {
                                position: 'top',
                                show: true
                            }
                        },
                        data: tmpData,
                        categories: unique(tmpData, f => f.category).map(f => ({
                            "name": f.category
                        })),
                        links: flat(tmpData.map(f => f.links.map(g => ({
                            "source": f.name,
                            "target": g,
                            "value": f.category === "group" || f.category === "PMS" || f.category === "PDM" ? 1 : (f.force ?? 0)
                        }))))
                    }
                ]
            }
        }
    },
}

</script>

<style scoped>
main {
    padding: 0;
    margin: 0;
}

footer {
    padding: 0;
    position: fixed;
    width: 100%;
    bottom: 0px;
}

#graph {
    width: 100%;
    height: calc(100vh - 60px);
}
</style>
