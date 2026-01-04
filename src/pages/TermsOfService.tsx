import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <AppLayout title="Terms of Service" showSearch={false} showCreate={false} showNav={false}>
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Campus Media – Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              These Terms of Service ("Terms") govern your access to and use of Campus Media (the
              "Service"). By using the Service, you agree to these Terms.
            </p>

            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1">
              <p className="font-medium">測試用聲明</p>
              <p>此網站目前僅供測試用途，非任何學校官方平台。</p>
              <p>未來若有正式網站/平台，資料可能會轉入正式網站或重置。</p>
              <p>由學生創建｜Credit: Huachen — s13207@kcis.com.tw / huachen0625@gmail.com</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">1. Testing / Non‑Official Notice</h3>
              <p>
                This Service is currently for testing and demonstration purposes only. It is not an
                official school product, and it is not affiliated with or endorsed by any school.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Accounts & Eligibility</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account and for all
                activities that occur under your account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Content</h3>
              <p>
                You are responsible for the content you post or share. Do not upload or share
                content that is unlawful, harmful, harassing, invasive of privacy, or that infringes
                on the rights of others.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">4. Data & Migration Disclaimer</h3>
              <p>
                Data in this testing Service may be reset, removed, or migrated in the future. If an
                official platform is launched later, data may be transferred or re-created there.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">5. No Warranty</h3>
              <p>
                The Service is provided "as is" and "as available" without warranties of any kind.
                We do not guarantee uninterrupted or error-free operation.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">6. Contact</h3>
              <p>
                Questions or requests: s13207@kcis.com.tw / huachen0625@gmail.com
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Last updated: 2026-01-04
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
