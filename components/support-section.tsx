"use client"

import { Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface SupportSectionProps {
  className?: string
}

export function SupportSection({ className = "" }: SupportSectionProps) {
  const supportEmail = "hritikparmar800@gmail.com"

  return (
    <section className={`py-3 md:py-4 ${className}`}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .support-card-email {
          animation: slideInUp 0.5s ease-out;
        }
        .support-card-email:hover {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .support-card-community {
          animation: slideInUp 0.7s ease-out;
        }
        .support-card-community:hover {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-2 max-w-2xl lg:max-w-xl mx-auto">
        {/* Email Support */}
        <Card className="support-card-email border-primary/20 hover:border-primary/50 transition-all hover:shadow-md">
          <CardHeader className="pb-1.5 pt-1.5 px-2 md:px-3 lg:px-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="p-0.5 md:p-1 lg:p-0.5 rounded-lg bg-primary/10">
                <Mail className="h-3 w-3 md:h-4 md:w-4 lg:h-3 lg:w-3 text-primary" />
              </div>
              <CardTitle className="text-xs md:text-sm lg:text-xs">Email Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-1.5 md:p-2 lg:p-1.5 space-y-1">
            <p className="text-xs text-muted-foreground line-clamp-1 hidden md:block">
              Get help anytime
            </p>
            <a href={`mailto:${supportEmail}`}>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs px-1.5 md:px-2 py-0.5 h-5 md:h-6 lg:h-5 text-xs border-primary/30 hover:border-primary hover:bg-primary/10"
              >
                <Mail className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden md:inline">Contact Us</span>
                <span className="md:hidden">Email</span>
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Community Support */}
        <Card className="support-card-community border-purple-500/20 hover:border-purple-500/50 transition-all hover:shadow-md">
          <CardHeader className="pb-1.5 pt-1.5 px-2 md:px-3 lg:px-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="p-0.5 md:p-1 lg:p-0.5 rounded-lg bg-purple-500/10">
                <Phone className="h-3 w-3 md:h-4 md:w-4 lg:h-3 lg:w-3 text-purple-500" />
              </div>
              <CardTitle className="text-xs md:text-sm lg:text-xs">Community</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-1.5 md:p-2 lg:p-1.5 space-y-1">
            <p className="text-xs text-muted-foreground line-clamp-1 hidden md:block">
              Connect with traders
            </p>
            <a href={`mailto:${supportEmail}`}>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs px-1.5 md:px-2 py-0.5 h-5 md:h-6 lg:h-5 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10"
              >
                <Phone className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden md:inline">Join Us</span>
                <span className="md:hidden">Chat</span>
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
