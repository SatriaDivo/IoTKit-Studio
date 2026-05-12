"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const stats = [
    {
      title: "Total Requests",
      value: "12,543",
      change: "+12.5%",
      trend: "up",
      icon: Activity,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Success Rate",
      value: "98.2%",
      change: "+2.1%",
      trend: "up",
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Avg Response Time",
      value: "145ms",
      change: "-8.3%",
      trend: "up",
      icon: Clock,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Error Rate",
      value: "1.8%",
      change: "-0.5%",
      trend: "up",
      icon: AlertTriangle,
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-slate-600 mt-1">
            Comprehensive insights into your IoT simulations
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white border-blue-100 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 font-medium">
                    {stat.change}
                  </span>
                  <span className="text-slate-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 shadow-md">
        <CardContent className="pt-6 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Analytics Coming Soon</h3>
          <p className="text-blue-100 max-w-2xl mx-auto">
            Advanced analytics dashboard with real-time charts, performance
            metrics, and detailed insights will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
